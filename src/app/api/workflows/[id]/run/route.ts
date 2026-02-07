import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WorkflowExecutor } from '@/lib/workflow-engine';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const workflowId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { document_id } = body as { document_id: string };

  if (!document_id) {
    return NextResponse.json({ error: 'document_id required' }, { status: 400 });
  }

  try {
    const executor = new WorkflowExecutor(supabase);
    const result = await executor.execute(workflowId, document_id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Workflow execution failed' },
      { status: 500 }
    );
  }
}
