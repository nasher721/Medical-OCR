import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: { documentId: string } }) {
  const supabase = createServerSupabaseClient();
  const documentId = params.documentId;

  const { data: doc } = await supabase
    .from('documents')
    .select('filename')
    .eq('id', documentId)
    .single();

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const { data: extractions } = await supabase
    .from('extractions')
    .select('id')
    .eq('document_id', documentId)
    .limit(1);

  if (!extractions || extractions.length === 0) {
    return NextResponse.json({ error: 'No extraction data' }, { status: 404 });
  }

  const { data: fields } = await supabase
    .from('extraction_fields')
    .select('key, value, confidence')
    .eq('extraction_id', extractions[0].id);

  if (!fields) return NextResponse.json({ error: 'No fields' }, { status: 404 });

  const headers = ['key', 'value', 'confidence'];
  const rows = fields.map(f => [f.key, `"${f.value.replace(/"/g, '""')}"`, f.confidence.toString()]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${doc.filename.replace(/\.[^.]+$/, '')}_export.csv"`,
    },
  });
}
