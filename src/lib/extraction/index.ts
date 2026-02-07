import type { ExtractionProvider } from './types';
import { MockExtractionProvider } from './mock-provider';

export type { ExtractionProvider, ExtractionResult, ExtractedField, BoundingBox, ExtractedTable } from './types';

// ============================================================
// PROVIDER SWAP POINT
// ============================================================
// To use a real OCR provider (Textract, Google Vision, Tesseract, etc.):
// 1. Create a new file implementing ExtractionProvider (e.g., textract-provider.ts)
// 2. Change the export below to use your new provider
// 3. All extraction calls flow through this single entry point
// ============================================================

export function getExtractionProvider(): ExtractionProvider {
  // Swap provider here:
  // return new TextractProvider();
  // return new GoogleVisionProvider();
  return new MockExtractionProvider();
}
