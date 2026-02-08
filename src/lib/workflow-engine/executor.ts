import type { SupabaseClient } from '@supabase/supabase-js';
import type { SerializedNode, SerializedEdge, WorkflowExecutionContext, StepResult, WorkflowNodeConfig } from './types';
import { getExtractionProvider } from '@/lib/extraction';
import { getNotificationProvider, renderNotificationEmail } from '@/lib/notifications';
import type { NotificationEventType } from '@/lib/notifications';

export class WorkflowExecutor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: SupabaseClient<any>;
  private nodes: SerializedNode[] = [];
  private edges: SerializedEdge[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(supabase: SupabaseClient<any>) {
    this.supabase = supabase;
  }

  async execute(workflowId: string, documentId: string): Promise<{ workflow_run_id: string; status: string }> {
    // Load workflow data
    const { data: workflow } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (!workflow) throw new Error('Workflow not found');

    const { data: nodes } = await this.supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId);

    const { data: edges } = await this.supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId);

    this.nodes = (nodes || []).map(n => ({
      node_id: n.node_id,
      type: n.type as SerializedNode['type'],
      position: n.position as SerializedNode['position'],
      config: n.config as WorkflowNodeConfig,
    }));

    this.edges = (edges || []).map(e => ({
      edge_id: e.edge_id,
      source: e.source,
      target: e.target,
    }));

    // Create workflow run
    const { data: run } = await this.supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        document_id: documentId,
        status: 'running',
      })
      .select()
      .single();

    if (!run) throw new Error('Failed to create workflow run');

    const ctx: WorkflowExecutionContext = {
      workflow_id: workflowId,
      workflow_run_id: run.id,
      document_id: documentId,
      org_id: workflow.org_id,
      current_step: 0,
    };

    // Execute nodes in topological order
    const sortedNodes = this.topologicalSort();
    let finalStatus = 'completed';

    for (const node of sortedNodes) {
      ctx.current_step++;

      // Log step start
      await this.supabase.from('workflow_logs').insert({
        workflow_run_id: run.id,
        step_order: ctx.current_step,
        node_id: node.node_id,
        status: 'running',
        message: `Executing ${node.type} node`,
      });

      try {
        const result = await this.executeNode(node, ctx);

        // Log step result
        await this.supabase.from('workflow_logs').insert({
          workflow_run_id: run.id,
          step_order: ctx.current_step,
          node_id: node.node_id,
          status: result.status,
          message: result.message,
          data: result.data || {},
        });

        if (result.status === 'paused') {
          finalStatus = 'paused';
          break;
        }
        if (result.status === 'failed') {
          await this.sendWorkflowErrorNotification(ctx);
          finalStatus = 'failed';
          break;
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        await this.supabase.from('workflow_logs').insert({
          workflow_run_id: run.id,
          step_order: ctx.current_step,
          node_id: node.node_id,
          status: 'failed',
          message: errMsg,
        });
        await this.sendWorkflowErrorNotification(ctx, errMsg);
        finalStatus = 'failed';
        break;
      }
    }

    // Update run status
    await this.supabase
      .from('workflow_runs')
      .update({ status: finalStatus as 'completed' | 'failed' | 'paused', finished_at: new Date().toISOString() })
      .eq('id', run.id);

    return { workflow_run_id: run.id, status: finalStatus };
  }

  private topologicalSort(): SerializedNode[] {
    const nodeMap = new Map(this.nodes.map(n => [n.node_id, n]));
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    this.nodes.forEach(n => {
      inDegree.set(n.node_id, 0);
      adjList.set(n.node_id, []);
    });

    this.edges.forEach(e => {
      adjList.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

    const sorted: SerializedNode[] = [];
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

  private async executeNode(node: SerializedNode, ctx: WorkflowExecutionContext): Promise<StepResult> {
    switch (node.type) {
      case 'upload':
      case 'api_ingest':
      case 'email_ingest':
        return { status: 'success', message: 'Input node - document already ingested' };

      case 'extract':
        return this.executeExtract(ctx);

      case 'rule':
        return this.executeRule(node.config, ctx);

      case 'review':
        return this.executeReview(ctx);

      case 'webhook_export':
        return this.executeWebhookExport(node.config, ctx);

      case 'csv_export':
        return this.executeCsvExport(node.config, ctx);

      case 'notify':
        return this.executeNotify(node.config, ctx);

      default:
        return { status: 'failed', message: `Unknown node type: ${node.type}` };
    }
  }

  private async executeExtract(ctx: WorkflowExecutionContext): Promise<StepResult> {
    // Check if extraction already exists
    const { data: existing } = await this.supabase
      .from('extractions')
      .select('id')
      .eq('document_id', ctx.document_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { status: 'success', message: 'Extraction already exists', data: { extraction_id: existing[0].id } };
    }

    // Get document
    const { data: doc } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', ctx.document_id)
      .single();

    if (!doc) return { status: 'failed', message: 'Document not found' };

    // Update status to processing
    await this.supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', ctx.document_id);

    // Run extraction
    const provider = getExtractionProvider();
    const result = await provider.extract({
      filename: doc.filename,
      mime_type: doc.mime_type,
    });

    // Store extraction
    const { data: extraction } = await this.supabase
      .from('extractions')
      .insert({
        document_id: ctx.document_id,
        model_id: doc.model_id,
        full_text: result.full_text,
        raw_json: result as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (!extraction) return { status: 'failed', message: 'Failed to create extraction' };

    // Store fields
    const fieldInserts = result.fields.map(f => ({
      extraction_id: extraction.id,
      key: f.key,
      value: f.value,
      confidence: f.confidence,
      bbox: f.bbox as unknown as Record<string, unknown>,
      page: f.page,
    }));

    await this.supabase.from('extraction_fields').insert(fieldInserts);

    // Log audit
    await this.supabase.from('audit_logs').insert({
      org_id: ctx.org_id,
      action: 'extraction_completed',
      entity_type: 'document',
      entity_id: ctx.document_id,
      details: { extraction_id: extraction.id, field_count: result.fields.length },
    });

    return {
      status: 'success',
      message: `Extracted ${result.fields.length} fields`,
      data: { extraction_id: extraction.id, field_count: result.fields.length },
    };
  }

  private async executeRule(config: WorkflowNodeConfig, ctx: WorkflowExecutionContext): Promise<StepResult> {
    const threshold = config.threshold ?? 0.90;

    // Get extraction fields
    const { data: extractions } = await this.supabase
      .from('extractions')
      .select('id')
      .eq('document_id', ctx.document_id)
      .limit(1);

    if (!extractions || extractions.length === 0) {
      return { status: 'failed', message: 'No extraction found for rule evaluation' };
    }

    const { data: fields } = await this.supabase
      .from('extraction_fields')
      .select('*')
      .eq('extraction_id', extractions[0].id);

    if (!fields) return { status: 'failed', message: 'No fields found' };

    // Check if any required field has low confidence
    const lowConfFields = fields.filter(f => f.confidence < threshold);
    const allAboveThreshold = lowConfFields.length === 0;

    if (allAboveThreshold) {
      const action = config.action_pass || 'approve';
      if (action === 'approve') {
        await this.supabase
          .from('documents')
          .update({ status: 'approved' })
          .eq('id', ctx.document_id);
      }
      return {
        status: 'success',
        message: `All fields above ${threshold} threshold - action: ${action}`,
        data: { passed: true, action },
      };
    } else {
      const action = config.action_fail || 'needs_review';
      await this.supabase
        .from('documents')
        .update({ status: action === 'reject' ? 'rejected' : 'needs_review' })
        .eq('id', ctx.document_id);
      return {
        status: 'success',
        message: `${lowConfFields.length} fields below ${threshold} - action: ${action}`,
        data: { passed: false, action, low_conf_fields: lowConfFields.map(f => f.key) },
      };
    }
  }

  private async executeReview(ctx: WorkflowExecutionContext): Promise<StepResult> {
    await this.supabase
      .from('documents')
      .update({ status: 'needs_review' })
      .eq('id', ctx.document_id);

    return {
      status: 'paused',
      message: 'Document requires human review',
      data: { document_id: ctx.document_id },
    };
  }

  private async executeWebhookExport(config: WorkflowNodeConfig, ctx: WorkflowExecutionContext): Promise<StepResult> {
    const url = config.url;
    if (!url) return { status: 'failed', message: 'No webhook URL configured' };

    // Get document + extraction data
    const { data: doc } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', ctx.document_id)
      .single();

    const { data: extractions } = await this.supabase
      .from('extractions')
      .select('*, extraction_fields(*)')
      .eq('document_id', ctx.document_id)
      .limit(1);

    const payload = {
      document: doc,
      extraction: extractions?.[0] || null,
      workflow_run_id: ctx.workflow_run_id,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {}),
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text().catch(() => '');

      return {
        status: response.ok ? 'success' : 'failed',
        message: `Webhook ${response.ok ? 'sent' : 'failed'}: ${response.status}`,
        data: { status_code: response.status, response_body: responseText.slice(0, 1000) },
      };
    } catch (error) {
      return {
        status: 'failed',
        message: `Webhook error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  private async executeCsvExport(config: WorkflowNodeConfig, ctx: WorkflowExecutionContext): Promise<StepResult> {
    const { data: extractions } = await this.supabase
      .from('extractions')
      .select('*, extraction_fields(*)')
      .eq('document_id', ctx.document_id)
      .limit(1);

    if (!extractions || extractions.length === 0) {
      return { status: 'failed', message: 'No extraction data for CSV export' };
    }

    const extraction = extractions[0];
    const fields = (extraction as Record<string, unknown>).extraction_fields as Array<{ key: string; value: string; confidence: number }>;

    if (!fields || fields.length === 0) {
      return { status: 'failed', message: 'No fields to export' };
    }

    // Filter fields if config specifies
    const exportFields = config.fields_to_export
      ? fields.filter(f => config.fields_to_export!.includes(f.key))
      : fields;

    // Generate CSV
    const headers = ['key', 'value', 'confidence'];
    const rows = exportFields.map(f => [f.key, `"${f.value}"`, f.confidence.toString()]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Store CSV in storage
    const csvPath = `${ctx.org_id}/${ctx.document_id}/export_${Date.now()}.csv`;
    await this.supabase.storage.from('documents').upload(csvPath, csv, {
      contentType: 'text/csv',
    });

    // Update document status
    await this.supabase
      .from('documents')
      .update({ status: 'exported' })
      .eq('id', ctx.document_id);

    return {
      status: 'success',
      message: `CSV exported with ${exportFields.length} fields`,
      data: { csv_path: csvPath, field_count: exportFields.length },
    };
  }

  private async executeNotify(config: WorkflowNodeConfig, ctx: WorkflowExecutionContext): Promise<StepResult> {
    const event = (config.notify_event || 'document_approved') as NotificationEventType;
    const recipients = await this.resolveNotificationRecipients(event, ctx.org_id, config.email_to);

    if (recipients.length === 0) {
      return { status: 'failed', message: `No recipients configured for ${event} notifications` };
    }

    const [{ data: org }, { data: doc }] = await Promise.all([
      this.supabase.from('orgs').select('name').eq('id', ctx.org_id).single(),
      this.supabase.from('documents').select('filename').eq('id', ctx.document_id).single(),
    ]);

    const { subject, html, text } = renderNotificationEmail(event, {
      orgName: org?.name,
      documentId: ctx.document_id,
      documentName: doc?.filename,
      workflowRunId: ctx.workflow_run_id,
    });

    const provider = getNotificationProvider();
    const response = await provider.send({
      event,
      to: recipients,
      subject,
      html,
      text,
    });

    return {
      status: 'success',
      message: `Notification sent to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`,
      data: { provider_id: response.id, recipients },
    };
  }

  private async resolveNotificationRecipients(
    event: NotificationEventType,
    orgId: string,
    additionalEmails?: string
  ): Promise<string[]> {
    const { data: prefs } = await this.supabase
      .from('notification_preferences')
      .select('email, document_approved, needs_review, workflow_error')
      .eq('org_id', orgId);

    const flagKey = event === 'document_approved'
      ? 'document_approved'
      : event === 'needs_review'
        ? 'needs_review'
        : 'workflow_error';

    const preferenceEmails = (prefs || [])
      .filter(pref => Boolean((pref as Record<string, unknown>)[flagKey]))
      .map(pref => pref.email);

    const configuredEmails = this.parseEmailList(additionalEmails);

    return Array.from(new Set([...preferenceEmails, ...configuredEmails]));
  }

  private parseEmailList(value?: string): string[] {
    if (!value) return [];
    return value
      .split(/[,;\\s]+/g)
      .map(entry => entry.trim())
      .filter(Boolean);
  }

  private async sendWorkflowErrorNotification(ctx: WorkflowExecutionContext, _errorMessage?: string): Promise<void> {
    try {
      await this.executeNotify({ notify_event: 'workflow_error' }, ctx);
    } catch {
      // Ignore notification errors to avoid masking workflow failures.
    }
  }
}
