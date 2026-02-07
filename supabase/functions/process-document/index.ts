// Supabase Edge Function: process-document
// Deno runtime - processes a document through the extraction pipeline

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
  bbox: BoundingBox;
  page: number;
}

interface ExtractionResult {
  full_text: string;
  fields: ExtractedField[];
}

// Deterministic hash for consistent mock results
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const VENDOR_NAMES = [
  'Acme Corp', 'TechFlow Inc', 'Global Supplies Ltd', 'Metro Services',
  'CloudNet Solutions', 'DataPrime LLC', 'Apex Manufacturing', 'Summit Trading Co',
  'Pioneer Electronics', 'Blue Ridge Consulting'
];

const LINE_ITEMS = [
  { desc: 'Cloud Hosting (Monthly)', unit: 299.99 },
  { desc: 'Software License - Enterprise', unit: 1499.00 },
  { desc: 'Professional Services - 40hrs', unit: 6000.00 },
  { desc: 'Data Storage - 500GB', unit: 49.99 },
  { desc: 'API Calls - 1M requests', unit: 199.00 },
];

function mockExtract(filename: string): ExtractionResult {
  const hash = simpleHash(filename);
  const rand = seededRandom(hash);
  const isInvoice = filename.toLowerCase().includes('invoice') || filename.toLowerCase().includes('bill');

  if (!isInvoice) {
    return {
      full_text: `Document: ${filename}\nGeneric document content.`,
      fields: [
        { key: 'document_title', value: filename.replace(/\.[^.]+$/, ''), confidence: 0.90, bbox: { x: 0.1, y: 0.1, w: 0.4, h: 0.03 }, page: 1 },
        { key: 'date', value: '2024-01-15', confidence: 0.85, bbox: { x: 0.1, y: 0.15, w: 0.3, h: 0.03 }, page: 1 },
      ],
    };
  }

  const vendor = VENDOR_NAMES[hash % VENDOR_NAMES.length];
  const invoiceNum = `INV-${2024000 + (hash % 1000)}`;
  const day = 1 + Math.floor(rand() * 28);
  const month = 1 + Math.floor(rand() * 12);
  const invoiceDate = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const itemCount = 1 + Math.floor(rand() * 3);
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    items.push(LINE_ITEMS[(hash + i) % LINE_ITEMS.length]);
  }

  const subtotal = items.reduce((sum, item) => sum + item.unit, 0);
  const taxRate = 0.08 + rand() * 0.04;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const confFor = (base: number) => Math.min(0.99, Math.max(0.65, parseFloat((base + (rand() * 0.1 - 0.05)).toFixed(2))));
  let yPos = 0.08;
  const bboxFor = () => {
    const x = 0.1 + rand() * 0.15;
    const y = yPos;
    yPos += 0.04 + rand() * 0.03;
    return { x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(3)), w: parseFloat((0.3 + rand() * 0.25).toFixed(3)), h: parseFloat((0.02 + rand() * 0.015).toFixed(3)) };
  };

  const fields: ExtractedField[] = [
    { key: 'invoice_number', value: invoiceNum, confidence: confFor(0.97), bbox: bboxFor(), page: 1 },
    { key: 'invoice_date', value: invoiceDate, confidence: confFor(0.95), bbox: bboxFor(), page: 1 },
    { key: 'vendor_name', value: vendor, confidence: confFor(0.96), bbox: bboxFor(), page: 1 },
    { key: 'subtotal', value: subtotal.toFixed(2), confidence: confFor(0.94), bbox: bboxFor(), page: 1 },
    { key: 'tax_amount', value: tax.toFixed(2), confidence: confFor(0.90), bbox: bboxFor(), page: 1 },
    { key: 'total_amount', value: total.toFixed(2), confidence: confFor(0.96), bbox: bboxFor(), page: 1 },
    { key: 'payment_terms', value: 'Net 30', confidence: confFor(0.82), bbox: bboxFor(), page: 1 },
  ];

  items.forEach((item, i) => {
    fields.push({ key: `line_item_${i + 1}_description`, value: item.desc, confidence: confFor(0.89), bbox: bboxFor(), page: 1 });
    fields.push({ key: `line_item_${i + 1}_amount`, value: item.unit.toFixed(2), confidence: confFor(0.92), bbox: bboxFor(), page: 1 });
  });

  return {
    full_text: `INVOICE\n${vendor}\nInvoice #: ${invoiceNum}\nDate: ${invoiceDate}\nTotal: $${total.toFixed(2)}`,
    fields,
  };
}

Deno.serve(async (req) => {
  try {
    const { document_id } = await req.json();

    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Update status
    await supabase.from('documents').update({ status: 'processing' }).eq('id', document_id);

    // Run mock extraction
    const result = mockExtract(doc.filename);

    // Store extraction
    const { data: extraction, error: extError } = await supabase
      .from('extractions')
      .insert({
        document_id,
        model_id: doc.model_id,
        full_text: result.full_text,
        raw_json: result,
      })
      .select()
      .single();

    if (extError || !extraction) {
      await supabase.from('documents').update({ status: 'uploaded' }).eq('id', document_id);
      return new Response(JSON.stringify({ error: 'Failed to create extraction' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Store fields
    const fieldInserts = result.fields.map((f) => ({
      extraction_id: extraction.id,
      key: f.key,
      value: f.value,
      confidence: f.confidence,
      bbox: f.bbox,
      page: f.page,
    }));

    await supabase.from('extraction_fields').insert(fieldInserts);

    // Determine status
    const threshold = 0.90;
    const hasLowConfidence = result.fields.some((f) => f.confidence < threshold);
    const newStatus = hasLowConfidence ? 'needs_review' : 'approved';

    await supabase.from('documents').update({ status: newStatus }).eq('id', document_id);

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: doc.org_id,
      action: 'document_processed',
      entity_type: 'document',
      entity_id: document_id,
      details: { extraction_id: extraction.id, field_count: result.fields.length, status: newStatus },
    });

    return new Response(
      JSON.stringify({ extraction_id: extraction.id, status: newStatus }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
