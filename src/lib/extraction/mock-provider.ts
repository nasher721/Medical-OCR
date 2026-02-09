import type { ExtractionProvider, ExtractionResult, ExtractedField } from './types';

// Deterministic hash for consistent results per filename
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
  { desc: 'SSL Certificate - Wildcard', unit: 89.99 },
  { desc: 'Technical Support - Premium', unit: 499.00 },
  { desc: 'Network Equipment', unit: 2340.00 },
  { desc: 'Office Supplies', unit: 156.50 },
  { desc: 'Consulting Hours - 20hrs', unit: 3000.00 },
];

function generateInvoiceFields(filename: string): { fields: ExtractedField[]; text: string } {
  const hash = simpleHash(filename);
  const rand = seededRandom(hash);

  const vendor = VENDOR_NAMES[hash % VENDOR_NAMES.length];
  const invoiceNum = `INV-${(2024000 + (hash % 1000)).toString()}`;
  const day = 1 + Math.floor(rand() * 28);
  const month = 1 + Math.floor(rand() * 12);
  const invoiceDate = `2024-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  const dueDay = Math.min(28, day + 30 % 28);
  const dueMonth = month === 12 ? 1 : month + 1;
  const dueDate = `2024-${dueMonth.toString().padStart(2, '0')}-${dueDay.toString().padStart(2, '0')}`;

  const itemCount = 1 + Math.floor(rand() * 3);
  const items: typeof LINE_ITEMS[0][] = [];
  for (let i = 0; i < itemCount; i++) {
    items.push(LINE_ITEMS[(hash + i) % LINE_ITEMS.length]);
  }

  const subtotal = items.reduce((sum, item) => sum + item.unit, 0);
  const taxRate = 0.08 + rand() * 0.04; // 8-12%
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const currency = 'USD';
  const poNumber = `PO-${(50000 + (hash % 10000)).toString()}`;

  // Generate confidence values that vary realistically
  const confFor = (base: number) => {
    const v = base + (rand() * 0.1 - 0.05);
    return Math.min(0.99, Math.max(0.65, parseFloat(v.toFixed(2))));
  };

  // Generate plausible bounding boxes (normalized 0-1 coordinates)
  let yPos = 0.08;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bboxFor = (_page: number = 1) => {
    const x = 0.1 + rand() * 0.15;
    const y = yPos;
    yPos += 0.04 + rand() * 0.03;
    if (yPos > 0.85) yPos = 0.15;
    return { x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(3)), w: parseFloat((0.3 + rand() * 0.25).toFixed(3)), h: parseFloat((0.02 + rand() * 0.015).toFixed(3)) };
  };

  const fields: ExtractedField[] = [
    { key: 'invoice_number', value: invoiceNum, confidence: confFor(0.97), bbox: bboxFor(), page: 1 },
    { key: 'invoice_date', value: invoiceDate, confidence: confFor(0.95), bbox: bboxFor(), page: 1 },
    { key: 'due_date', value: dueDate, confidence: confFor(0.93), bbox: bboxFor(), page: 1 },
    { key: 'vendor_name', value: vendor, confidence: confFor(0.96), bbox: bboxFor(), page: 1 },
    { key: 'vendor_address', value: `${100 + hash % 900} Business Ave, Suite ${hash % 500}`, confidence: confFor(0.88), bbox: bboxFor(), page: 1 },
    { key: 'po_number', value: poNumber, confidence: confFor(0.91), bbox: bboxFor(), page: 1 },
    { key: 'subtotal', value: subtotal.toFixed(2), confidence: confFor(0.94), bbox: bboxFor(), page: 1 },
    { key: 'tax_rate', value: `${(taxRate * 100).toFixed(1)}%`, confidence: confFor(0.85), bbox: bboxFor(), page: 1 },
    { key: 'tax_amount', value: tax.toFixed(2), confidence: confFor(0.90), bbox: bboxFor(), page: 1 },
    { key: 'total_amount', value: total.toFixed(2), confidence: confFor(0.96), bbox: bboxFor(), page: 1 },
    { key: 'currency', value: currency, confidence: confFor(0.98), bbox: bboxFor(), page: 1 },
    { key: 'payment_terms', value: 'Net 30', confidence: confFor(0.82), bbox: bboxFor(), page: 1 },
  ];

  // Add line items as fields
  items.forEach((item, i) => {
    fields.push({
      key: `line_item_${i + 1}_description`,
      value: item.desc,
      confidence: confFor(0.89),
      bbox: bboxFor(),
      page: 1,
    });
    fields.push({
      key: `line_item_${i + 1}_amount`,
      value: item.unit.toFixed(2),
      confidence: confFor(0.92),
      bbox: bboxFor(),
      page: 1,
    });
  });

  const text = `INVOICE\n\n${vendor}\n${fields[4].value}\n\nInvoice #: ${invoiceNum}\nDate: ${invoiceDate}\nDue Date: ${dueDate}\nPO: ${poNumber}\n\n${items.map((it, i) => `${i + 1}. ${it.desc}  $${it.unit.toFixed(2)}`).join('\n')}\n\nSubtotal: $${subtotal.toFixed(2)}\nTax (${(taxRate * 100).toFixed(1)}%): $${tax.toFixed(2)}\nTotal: $${total.toFixed(2)} ${currency}\n\nPayment Terms: Net 30`;

  return { fields, text };
}

function generateGenericFields(filename: string): { fields: ExtractedField[]; text: string } {
  const hash = simpleHash(filename);
  const rand = seededRandom(hash);

  const confFor = (base: number) => Math.min(0.99, Math.max(0.65, parseFloat((base + (rand() * 0.1 - 0.05)).toFixed(2))));
  let yPos = 0.1;
  const bboxFor = () => {
    const x = 0.1 + rand() * 0.15;
    const y = yPos;
    yPos += 0.05 + rand() * 0.03;
    return { x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(3)), w: parseFloat((0.3 + rand() * 0.3).toFixed(3)), h: parseFloat((0.02 + rand() * 0.02).toFixed(3)) };
  };

  const fields: ExtractedField[] = [
    { key: 'document_title', value: filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '), confidence: confFor(0.90), bbox: bboxFor(), page: 1 },
    { key: 'date', value: '2024-01-15', confidence: confFor(0.85), bbox: bboxFor(), page: 1 },
    { key: 'author', value: 'Document Author', confidence: confFor(0.75), bbox: bboxFor(), page: 1 },
    { key: 'category', value: 'General', confidence: confFor(0.70), bbox: bboxFor(), page: 1 },
  ];

  return {
    fields,
    text: `Document: ${filename}\nExtracted generic content for non-invoice document type.`,
  };
}

export class MockExtractionProvider implements ExtractionProvider {
  async extract(document: { filename: string; content?: ArrayBuffer; mime_type: string }): Promise<ExtractionResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const isInvoice = document.filename.toLowerCase().includes('invoice') ||
      document.filename.toLowerCase().includes('inv_') ||
      document.filename.toLowerCase().includes('bill');

    const { fields, text } = isInvoice
      ? generateInvoiceFields(document.filename)
      : generateGenericFields(document.filename);

    return {
      full_text: text,
      fields,
      tables: isInvoice ? [{
        headers: ['Item', 'Description', 'Amount'],
        rows: fields
          .filter(f => f.key.includes('line_item') && f.key.includes('description'))
          .map((f, i) => {
            const amountField = fields.find(af => af.key === `line_item_${i + 1}_amount`);
            return [`${i + 1}`, f.value, `$${amountField?.value || '0.00'}`];
          }),
        page: 1,
        bbox: { x: 0.08, y: 0.35, w: 0.84, h: 0.25 },
      }] : undefined,
    };
  }
}
