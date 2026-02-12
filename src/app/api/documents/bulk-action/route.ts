import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { uuidv4 } from 'uuid';

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

    let snapshot_before: any = null;
    let snapshot_after: any = null;

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

            const { document_ids: before_snapshot } = history.document_ids as string[];
            const targetStatus = (history.before_snapshot as any).status;

            for (const docId of document_ids) {
                const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single();

                if (!doc) continue;

                snapshot_before = {
                    id: doc.id,
                    status: doc.status,
                    updated_at: doc.updated_at,
                };

                if (targetStatus === 'approved' || targetStatus === 'rejected') {
                    await supabase.from('documents').update({ status: targetStatus }).eq('id', docId);
                    snapshot_after = { id: doc.id, status: targetStatus, updated_at: new Date().toISOString() };
                } else if (targetStatus === 'processing') {
                    await supabase.from('documents').update({ status: 'processing' }).eq('id', docId);
                    snapshot_after = { id: doc.id, status: 'processing', updated_at: new Date().toISOString() };
                }
            }

            const operationId = uuidv4();
            await supabase.from('bulk_operation_history').insert({
                org_id,
                user_id: user.id,
                action: 'undo',
                document_ids,
                before_snapshot: snapshot_before,
                after_snapshot: snapshot_after,
                status: 'completed',
                created_at: new Date().toISOString(),
            });

            return NextResponse.json({ document_ids, operation_id });
        } else {
            for (const docId of document_ids) {
                const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single();

                if (!doc) continue;

                snapshot_before = {
                    id: doc.id,
                    status: doc.status,
                    updated_at: doc.updated_at,
                };

                switch (action) {
                    case 'approve':
                        await supabase.from('documents').update({ status: 'approved' }).eq('id', docId);
                        snapshot_after = { id: doc.id, status: 'approved', updated_at: new Date().toISOString() };
                        break;
                    case 'reject':
                        await supabase.from('documents').update({ status: 'rejected' }).eq('id', docId);
                        snapshot_after = { id: doc.id, status: 'rejected', updated_at: new Date().toISOString() };
                        break;
                    case 'reprocess':
                        await supabase.from('documents').update({ status: 'processing' }).eq('id', docId);
                        snapshot_after = { id: doc.id, status: 'processing', updated_at: new Date().toISOString() };

                        const processResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/documents/${docId}/process`, { method: 'POST' });
                        if (processResp.ok) {
                            const processData = await processResp.json();
                            snapshot_after = { id: doc.id, status: processData.status, updated_at: new Date().toISOString() };
                        } else {
                            snapshot_after = { id: doc.id, status: 'process_failed' };
                        }
                        break;
                    case 'delete':
                        await supabase.from('documents').delete().eq('id', docId);
                        snapshot_after = { id: doc.id, status: 'deleted', updated_at: new Date().toISOString() };
                        break;
                }
            }

            const operationId = uuidv4();
            await supabase.from('bulk_operation_history').insert({
                org_id,
                user_id: user.id,
                action,
                document_ids,
                before_snapshot: snapshot_before,
                after_snapshot: snapshot_after,
                status: 'completed',
                created_at: new Date().toISOString(),
            });

            return NextResponse.json({ results, operation_id });
        }
    } catch (error) {
        console.error('Bulk action error:', error);
        return NextResponse.json({ error: error.message, results, operation_id, status: 'failed' }, { status: 500 });
    }
}