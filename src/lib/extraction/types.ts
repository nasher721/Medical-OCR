export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
  bbox: BoundingBox;
  page: number;
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  page: number;
  bbox: BoundingBox;
}

export interface ExtractionResult {
  full_text: string;
  fields: ExtractedField[];
  tables?: ExtractedTable[];
}

export interface ExtractionProvider {
  extract(document: { filename: string; content?: ArrayBuffer; mime_type: string }): Promise<ExtractionResult>;
}
