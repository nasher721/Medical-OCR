import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { action, document_ids, undo_id } = body as { action?: string; document_ids?: string[]; undo_id?: string };

    if (!action || !document_ids?.length) {
        return NextResponse.json({ error: 'action and document_ids are required' }, { status: 400 });
    }

    if (!['approve', 'reject', 'reprocess', 'delete', 'undo'].includes(action)) {
        return NextResponse.json({ error: 'Invalid action. Use: approve, reject, reprocess, delete, or undo' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const org_id = user.id;

    // Track results and snapshots
    const results: any[] = [];
    const snapshots_before: any[] = [];
    const snapshots_after: any[] = [];

    // Generate operation ID
    const operationId = uuidv4();

    try {
        if (action === 'undo') {
            if (!undo_id) {
                return NextResponse.json({ error: 'undo_id is required for undo operation' }, { status: 400 });
            }

            const { data: history } = await supabase
                .from('bulk_operation_history')
                .select('*')
                .eq('id', undo_id)
                .single();

            if (!history || history.status !== 'completed') {
                return NextResponse.json({ error: 'No completed operation found to undo' }, { status: 404 });
            }

            // This logic assumes before_snapshot in history contains status info we can revert to.
            // Using loose typing to access properties
            const targetStatus = (history.before_snapshot as any)?.status || 'processing';

            for (const docId of document_ids) {
                const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single();

                if (!doc) continue;

                snapshots_before.push({
                    id: doc.id,
                    status: doc.status,
                    updated_at: doc.updated_at,
                });

                if (targetStatus) {
                    await supabase.from('documents').update({ status: targetStatus }).eq('id', docId);
                    const afterSnapshot = { id: doc.id, status: targetStatus, updated_at: new Date().toISOString() };
                    snapshots_after.push(afterSnapshot);
                    results.push({ id: doc.id, status: 'success', data: afterSnapshot });
                }
            }

            await supabase.from('bulk_operation_history').insert({
                id: operationId,
                org_id,
                user_id: user.id,
                action: 'undo',
                document_ids,
                before_snapshot: snapshots_before.length === 1 ? snapshots_before[0] : snapshots_before,
                after_snapshot: snapshots_after.length === 1 ? snapshots_after[0] : snapshots_after,
                status: 'completed',
                created_at: new Date().toISOString(),
            });

            return NextResponse.json({ results, operation_id: operationId });
        } else {
            for (const docId of document_ids) {
                const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single();

                if (!doc) continue;

                snapshots_before.push({
                    id: doc.id,
                    status: doc.status,
                    updated_at: doc.updated_at,
                });

                let afterSnapshot: any = null;

                switch (action) {
                    case 'approve':
                        await supabase.from('documents').update({ status: 'approved' }).eq('id', docId);
                        afterSnapshot = { id: doc.id, status: 'approved', updated_at: new Date().toISOString() };
                        break;
                    case 'reject':
                        await supabase.from('documents').update({ status: 'rejected' }).eq('id', docId);
                        afterSnapshot = { id: doc.id, status: 'rejected', updated_at: new Date().toISOString() };
                        break;
                    case 'reprocess':
                        await supabase.from('documents').update({ status: 'processing' }).eq('id', docId);

                        // Async process trigger
                        const processResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/documents/${docId}/process`, { method: 'POST' });
                        if (processResp.ok) {
                            const processData = await processResp.json();
                            afterSnapshot = { id: doc.id, status: processData.status || 'processing', updated_at: new Date().toISOString() };
                        } else {
                            afterSnapshot = { id: doc.id, status: 'process_failed' };
                        }
                        break;
                    case 'delete':
                        await supabase.from('documents').delete().eq('id', docId);
                        afterSnapshot = { id: doc.id, status: 'deleted', updated_at: new Date().toISOString() };
                        break;
                }

                if (afterSnapshot) {
                    snapshots_after.push(afterSnapshot);
                    results.push({ id: doc.id, status: 'success', data: afterSnapshot });
                }
            }

            await supabase.from('bulk_operation_history').insert({
                id: operationId,
                org_id,
                user_id: user.id,
                action,
                document_ids,
                before_snapshot: snapshots_before.length === 1 ? snapshots_before[0] : snapshots_before,
                after_snapshot: snapshots_after.length === 1 ? snapshots_after[0] : snapshots_after,
                status: 'completed',
                created_at: new Date().toISOString(),
            });

            return NextResponse.json({ results, operation_id: operationId });
        }
    } catch (error: any) {
        console.error('Bulk action error:', error);
        return NextResponse.json({ error: error.message, results, operation_id: operationId, status: 'failed' }, { status: 500 });
    }
}