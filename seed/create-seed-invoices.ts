/**
 * Seed Invoice Generator
 * Generates 10 sample invoice HTML files that can be printed to PDF
 * or used as-is for testing the extraction pipeline.
 *
 * Run: npx ts-node seed/create-seed-invoices.ts
 * Or just use the pre-created files in seed/docs/
 */

import fs from 'fs';
import path from 'path';

const invoices = [
  { vendor: 'Acme Corp', num: 'INV-2024001', date: '2024-01-15', items: [{ desc: 'Cloud Hosting (Monthly)', amount: 299.99 }, { desc: 'SSL Certificate', amount: 89.99 }], tax: 0.085 },
  { vendor: 'TechFlow Inc', num: 'INV-2024002', date: '2024-02-03', items: [{ desc: 'Software License - Enterprise', amount: 1499.00 }], tax: 0.09 },
  { vendor: 'Global Supplies Ltd', num: 'INV-2024003', date: '2024-02-20', items: [{ desc: 'Office Supplies', amount: 156.50 }, { desc: 'Printer Paper (10 reams)', amount: 45.00 }], tax: 0.08 },
  { vendor: 'Metro Services', num: 'INV-2024004', date: '2024-03-01', items: [{ desc: 'Professional Services - 40hrs', amount: 6000.00 }, { desc: 'Travel Expenses', amount: 850.00 }], tax: 0.095 },
  { vendor: 'CloudNet Solutions', num: 'INV-2024005', date: '2024-03-15', items: [{ desc: 'API Calls - 1M requests', amount: 199.00 }, { desc: 'Data Storage - 500GB', amount: 49.99 }, { desc: 'CDN Bandwidth', amount: 79.99 }], tax: 0.085 },
  { vendor: 'DataPrime LLC', num: 'INV-2024006', date: '2024-04-01', items: [{ desc: 'Database Management', amount: 450.00 }, { desc: 'Backup Service', amount: 120.00 }], tax: 0.09 },
  { vendor: 'Apex Manufacturing', num: 'INV-2024007', date: '2024-04-18', items: [{ desc: 'Network Equipment', amount: 2340.00 }], tax: 0.10 },
  { vendor: 'Summit Trading Co', num: 'INV-2024008', date: '2024-05-05', items: [{ desc: 'Consulting Hours - 20hrs', amount: 3000.00 }, { desc: 'Report Generation', amount: 500.00 }], tax: 0.085 },
  { vendor: 'Pioneer Electronics', num: 'INV-2024009', date: '2024-05-22', items: [{ desc: 'Server Hardware', amount: 4500.00 }, { desc: 'Installation Service', amount: 750.00 }, { desc: 'Warranty Extension', amount: 299.00 }], tax: 0.095 },
  { vendor: 'Blue Ridge Consulting', num: 'INV-2024010', date: '2024-06-01', items: [{ desc: 'Technical Support - Premium', amount: 499.00 }], tax: 0.08 },
];

const docsDir = path.join(__dirname, 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

invoices.forEach((inv, i) => {
  const subtotal = inv.items.reduce((s, item) => s + item.amount, 0);
  const tax = subtotal * inv.tax;
  const total = subtotal + tax;

  const html = `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
  .vendor { font-size: 24px; font-weight: bold; color: #1e40af; }
  .invoice-info { text-align: right; }
  .invoice-num { font-size: 20px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f1f5f9; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
  .totals { text-align: right; margin-top: 20px; }
  .totals td { padding: 8px 12px; }
  .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #1e40af; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
</style></head>
<body>
  <div class="header">
    <div>
      <div class="vendor">${inv.vendor}</div>
      <div>123 Business Ave, Suite ${100 + i}</div>
      <div>San Francisco, CA 94102</div>
    </div>
    <div class="invoice-info">
      <div class="invoice-num">${inv.num}</div>
      <div>Date: ${inv.date}</div>
      <div>Due: Net 30</div>
      <div>PO: PO-${50000 + i}</div>
    </div>
  </div>

  <div><strong>Bill To:</strong></div>
  <div>Medical OCR Corp</div>
  <div>456 Health St</div>
  <div>New York, NY 10001</div>

  <table>
    <thead>
      <tr><th>#</th><th>Description</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>
      ${inv.items.map((item, j) => `<tr><td>${j + 1}</td><td>${item.desc}</td><td style="text-align:right">$${item.amount.toFixed(2)}</td></tr>`).join('\n      ')}
    </tbody>
  </table>

  <table class="totals" style="width: 300px; margin-left: auto;">
    <tr><td>Subtotal:</td><td>$${subtotal.toFixed(2)}</td></tr>
    <tr><td>Tax (${(inv.tax * 100).toFixed(1)}%):</td><td>$${tax.toFixed(2)}</td></tr>
    <tr class="total-row"><td>Total:</td><td>$${total.toFixed(2)} USD</td></tr>
  </table>

  <div class="footer">
    <p>Payment Terms: Net 30 | Please reference invoice number ${inv.num} with your payment.</p>
    <p>${inv.vendor} | Tax ID: ${90 + i}-${1000000 + i * 111111}</p>
  </div>
</body>
</html>`;

  const filename = `invoice_${inv.num.toLowerCase().replace(/-/g, '_')}_${inv.vendor.toLowerCase().replace(/\s+/g, '_')}.html`;
  fs.writeFileSync(path.join(docsDir, filename), html);
  console.log(`Created: ${filename}`);
});

console.log(`\n${invoices.length} seed invoice files created in seed/docs/`);
console.log('These HTML files simulate invoice documents for the mock extraction pipeline.');
console.log('The mock extractor uses the filename to generate deterministic extraction results.');
