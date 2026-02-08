import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockExtractionProvider } from './mock-provider';

describe('MockExtractionProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns invoice fields and table data for invoice filenames', async () => {
    const provider = new MockExtractionProvider();
    const promise = provider.extract({ filename: 'invoice_123.pdf', mime_type: 'application/pdf' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.fields.some((field) => field.key === 'invoice_number')).toBe(true);
    expect(result.tables).toBeDefined();
    expect(result.tables?.[0].headers).toEqual(['Item', 'Description', 'Amount']);
    expect(result.full_text).toContain('INVOICE');
  });

  it('returns generic fields for non-invoice filenames', async () => {
    const provider = new MockExtractionProvider();
    const promise = provider.extract({ filename: 'report.pdf', mime_type: 'application/pdf' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.fields.some((field) => field.key === 'document_title')).toBe(true);
    expect(result.tables).toBeUndefined();
    expect(result.full_text).toContain('report');
  });
});
