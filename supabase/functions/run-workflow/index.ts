// Supabase Edge Function: run-workflow
// Deno runtime - executes a workflow for a given document

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WorkflowNode {
  node_id: string;
  type: string;
  config: Record<string, unknown>;
}

interface WorkflowEdge {
  source: string;
  target: string;
}

function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodeMap = new Map(nodes.map(n => [n.node_id, n]));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  nodes.forEach(n => {
    inDegree.set(n.node_id, 0);
    adjList.set(n.node_id, []);
  });

  edges.forEach(e => {
    adjList.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  const sorted: WorkflowNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const neighbor of (adjList.get(id) || [])) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }
  return sorted;
}

Deno.serve(async (req) => {
  try {
    const { workflow_id, document_id } = await req.json();

    if (!workflow_id || !document_id) {
      return new Response(JSON.stringify({ error: 'workflow_id and document_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load workflow
    const { data: workflow } = await supabase.from('workflows').select('*').eq('id', workflow_id).single();
    if (!workflow) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: dbNodes } = await supabase.from('workflow_nodes').select('*').eq('workflow_id', workflow_id);
    const { data: dbEdges } = await supabase.from('workflow_edges').select('*').eq('workflow_id', workflow_id);

    const nodes: WorkflowNode[] = (dbNodes || []).map(n => ({ node_id: n.node_id, type: n.type, config: n.config as Record<string, unknown> }));
    const edges: WorkflowEdge[] = (dbEdges || []).map(e => ({ source: e.source, target: e.target }));

    // Create run
    const { data: run } = await supabase
      .from('workflow_runs')
      .insert({ workflow_id, document_id, status: 'running' })
      .select()
      .single();

    if (!run) {
      return new Response(JSON.stringify({ error: 'Failed to create run' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const sorted = topologicalSort(nodes, edges);
    let finalStatus = 'completed';
    let stepOrder = 0;

    for (const node of sorted) {
      stepOrder++;

      await supabase.from('workflow_logs').insert({
        workflow_run_id: run.id,
        step_order: stepOrder,
        node_id: node.node_id,
        status: 'running',
        message: `Starting ${node.type} node`,
      });

      try {
        let result: { status: string; message: string; data?: Record<string, unknown> };

        switch (node.type) {
          case 'upload':
          case 'api_ingest':
          case 'email_ingest':
            result = { status: 'success', message: 'Input node - document already ingested' };
            break;

          case 'extract': {
            // Check existing extraction
            const { data: existing } = await supabase.from('extractions').select('id').eq('document_id', document_id).limit(1);
            if (existing && existing.length > 0) {
              result = { status: 'success', message: 'Extraction already exists', data: { extraction_id: existing[0].id } };
            } else {
              // Call process-document function internally
              const processUrl = `${supabaseUrl}/functions/v1/process-document`;
              const processResp = await fetch(processUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ document_id }),
              });
              const processData = await processResp.json();
              result = processResp.ok
                ? { status: 'success', message: `Extraction complete: ${processData.status}`, data: processData }
                : { status: 'failed', message: processData.error || 'Extraction failed' };
            }
            break;
          }

          case 'rule': {
            const threshold = (node.config.threshold as number) || 0.90;
            const { data: extractions } = await supabase.from('extractions').select('id').eq('document_id', document_id).limit(1);
            if (!extractions || extractions.length === 0) {
              result = { status: 'failed', message: 'No extraction for rule evaluation' };
            } else {
              const { data: fields } = await supabase.from('extraction_fields').select('key, confidence').eq('extraction_id', extractions[0].id);
              const lowConf = (fields || []).filter(f => f.confidence < threshold);
              if (lowConf.length === 0) {
                const action = (node.config.action_pass as string) || 'approve';
                if (action === 'approve') {
                  await supabase.from('documents').update({ status: 'approved' }).eq('id', document_id);
                }
                result = { status: 'success', message: `All fields above threshold - ${action}`, data: { passed: true } };
              } else {
                const action = (node.config.action_fail as string) || 'needs_review';
                await supabase.from('documents').update({ status: action === 'reject' ? 'rejected' : 'needs_review' }).eq('id', document_id);
                result = { status: 'success', message: `${lowConf.length} fields below threshold - ${action}`, data: { passed: false, low_fields: lowConf.map(f => f.key) } };
              }
            }
            break;
          }

          case 'review':
            await supabase.from('documents').update({ status: 'needs_review' }).eq('id', document_id);
            result = { status: 'paused', message: 'Document requires human review' };
            break;

          case 'webhook_export': {
            const url = node.config.url as string;
            if (!url) {
              result = { status: 'failed', message: 'No webhook URL configured' };
            } else {
              const { data: doc } = await supabase.from('documents').select('*').eq('id', document_id).single();
              const { data: exts } = await supabase.from('extractions').select('*, extraction_fields(*)').eq('document_id', document_id).limit(1);
              const payload = { document: doc, extraction: exts?.[0] || null, workflow_run_id: run.id, timestamp: new Date().toISOString() };

              try {
                const resp = await fetch(url, {
                  method: (node.config.method as string) || 'POST',
                  headers: { 'Content-Type': 'application/json', ...(node.config.headers as Record<string, string> || {}) },
                  body: JSON.stringify(payload),
                });
                const respText = await resp.text().catch(() => '');
                result = { status: resp.ok ? 'success' : 'failed', message: `Webhook ${resp.status}`, data: { status_code: resp.status, body: respText.slice(0, 500) } };
              } catch (e) {
                result = { status: 'failed', message: `Webhook error: ${e.message}` };
              }
            }
            break;
          }

          case 'csv_export': {
            const { data: exts } = await supabase.from('extractions').select('id').eq('document_id', document_id).limit(1);
            if (!exts || exts.length === 0) {
              result = { status: 'failed', message: 'No extraction for CSV' };
            } else {
              const { data: fields } = await supabase.from('extraction_fields').select('key, value, confidence').eq('extraction_id', exts[0].id);
              const csv = ['key,value,confidence', ...(fields || []).map(f => `${f.key},"${f.value}",${f.confidence}`)].join('\n');
              const csvPath = `${workflow.org_id}/${document_id}/export_${Date.now()}.csv`;
              await supabase.storage.from('documents').upload(csvPath, csv, { contentType: 'text/csv' });
              await supabase.from('documents').update({ status: 'exported' }).eq('id', document_id);
              result = { status: 'success', message: `CSV exported: ${(fields || []).length} fields`, data: { csv_path: csvPath } };
            }
            break;
          }

          case 'notify':
            result = { status: 'success', message: `Email stub: would notify ${node.config.email_to || 'recipient'}` };
            break;

          default:
            result = { status: 'failed', message: `Unknown node type: ${node.type}` };
        }

        await supabase.from('workflow_logs').insert({
          workflow_run_id: run.id,
          step_order: stepOrder,
          node_id: node.node_id,
          status: result.status,
          message: result.message,
          data: result.data || {},
        });

        if (result.status === 'paused') { finalStatus = 'paused'; break; }
        if (result.status === 'failed') { finalStatus = 'failed'; break; }
      } catch (error) {
        await supabase.from('workflow_logs').insert({
          workflow_run_id: run.id,
          step_order: stepOrder,
          node_id: node.node_id,
          status: 'failed',
          message: error.message,
        });
        finalStatus = 'failed';
        break;
      }
    }

    await supabase.from('workflow_runs').update({ status: finalStatus, finished_at: new Date().toISOString() }).eq('id', run.id);

    return new Response(
      JSON.stringify({ workflow_run_id: run.id, status: finalStatus }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
