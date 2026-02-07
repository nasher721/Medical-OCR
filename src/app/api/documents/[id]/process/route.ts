import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getExtractionProvider } from '@/lib/extraction';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const documentId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Update status to processing
  await supabase
    .from('documents')
    .update({ status: 'processing' })
    .eq('id', documentId);

  try {
    // Run extraction
    const provider = getExtractionProvider();
    const result = await provider.extract({
      filename: doc.filename,
      mime_type: doc.mime_type,
    });

    // Store extraction
    const { data: extraction, error: extError } = await supabase
      .from('extractions')
      .insert({
        document_id: documentId,
        model_id: doc.model_id,
        full_text: result.full_text,
        raw_json: result as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (extError || !extraction) {
      await supabase.from('documents').update({ status: 'uploaded' }).eq('id', documentId);
      return NextResponse.json({ error: 'Failed to create extraction' }, { status: 500 });
    }

    // Store fields
    const fieldInserts = result.fields.map(f => ({
      extraction_id: extraction.id,
      key: f.key,
      value: f.value,
      confidence: f.confidence,
      bbox: f.bbox as unknown as Record<string, unknown>,
      page: f.page,
    }));

    await supabase.from('extraction_fields').insert(fieldInserts);

    // Determine status based on confidence threshold (0.90 default)
    const threshold = 0.90;
    const hasLowConfidence = result.fields.some(f => f.confidence < threshold);
    const newStatus = hasLowConfidence ? 'needs_review' : 'approved';

    await supabase
      .from('documents')
      .update({ status: newStatus })
      .eq('id', documentId);

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: doc.org_id,
      actor_id: user.id,
      action: 'document_processed',
      entity_type: 'document',
      entity_id: documentId,
      details: {
        extraction_id: extraction.id,
        field_count: result.fields.length,
        status: newStatus,
        has_low_confidence: hasLowConfidence,
      },
    });

    return NextResponse.json({
      extraction_id: extraction.id,
      status: newStatus,
      field_count: result.fields.length,
    });
  } catch (error) {
    await supabase.from('documents').update({ status: 'uploaded' }).eq('id', documentId);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
