import { SupabaseClient } from '@supabase/supabase-js';
import { WorkflowExecutor } from './executor';

export async function triggerDocumentProcessing(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    documentId: string,
    orgId: string,
    docType: string
) {
    // 1. Find active workflow for this doc type
    const { data: workflows } = await supabase
        .from('workflows')
        .select('id')
        .eq('org_id', orgId)
        .eq('doc_type', docType)
        .eq('is_active', true)
        .limit(1);

    let workflowId = workflows?.[0]?.id;

    if (!workflowId) {
        console.log(`[Trigger] No active workflow for ${docType}, creating default...`);
        // Create default workflow
        const { data: wf, error: wfError } = await supabase
            .from('workflows')
            .insert({
                org_id: orgId,
                name: `Default ${docType} Workflow`,
                doc_type: docType,
                is_active: true
            })
            .select()
            .single();

        if (wfError) {
            console.error('[Trigger] Failed to create default workflow:', wfError);
            return;
        }

        if (wf) {
            workflowId = wf.id;
            // Add extraction node
            const { error: nodeError } = await supabase.from('workflow_nodes').insert({
                workflow_id: wf.id,
                node_id: 'extract_1',
                type: 'extract',
                position: { x: 100, y: 100 },
                config: {}
            });
            if (nodeError) console.error('[Trigger] Failed to create extraction node:', nodeError);
        }
    }

    if (workflowId) {
        console.log(`[Trigger] Executing workflow ${workflowId} for document ${documentId}`);
        const executor = new WorkflowExecutor(supabase);

        // We await here because we don't have a background queue yet.
        // The MockProvider delay is short enough (approx 1s) to be acceptable for MVP.
        // In production, this should be offloaded to a background job.
        try {
            const result = await executor.execute(workflowId, documentId);
            console.log(`[Trigger] Workflow execution result:`, result);
        } catch (err) {
            console.error(`[Trigger] Workflow execution failed:`, err);
        }
    }
}
