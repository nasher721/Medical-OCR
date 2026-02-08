import type { FieldSchema, OcrToken } from '@/lib/supabase/types';

export type FieldSuggestion = {
  id: string;
  field_key: string;
  value: string;
  confidence: number;
  page_number: number;
  bbox: { x: number; y: number; w: number; h: number };
  source: 'pattern' | 'layout';
};

const FIELD_HINTS: Record<string, RegExp[]> = {
  Patient_Name: [/patient name/i, /name\b/i],
  MRN: [/mrn/i, /medical record/i],
  DOB: [/dob/i, /date of birth/i],
  Date_of_Service: [/date of service/i, /dos/i],
  Ordering_Physician: [/ordering physician/i, /provider/i],
  Medication_Name: [/medication/i, /rx/i],
  Medication_Dose: [/dose/i, /dosage/i],
  Blood_Pressure: [/bp/i, /blood pressure/i],
  Heart_Rate: [/hr/i, /heart rate/i],
  Sodium: [/sodium/i, /\bna\b/i],
  Creatinine: [/creatinine/i, /\bcr\b/i],
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const tokensToBBox = (tokens: OcrToken[]) => {
  const minX = Math.min(...tokens.map((t) => t.bbox.x));
  const minY = Math.min(...tokens.map((t) => t.bbox.y));
  const maxX = Math.max(...tokens.map((t) => t.bbox.x + t.bbox.w));
  const maxY = Math.max(...tokens.map((t) => t.bbox.y + t.bbox.h));
  return {
    x: clamp(minX),
    y: clamp(minY),
    w: clamp(maxX - minX),
    h: clamp(maxY - minY),
  };
};

const guessValueFromTokens = (tokens: OcrToken[], index: number) => {
  const slice = tokens.slice(index + 1, index + 6);
  return slice.map((token) => token.text).join(' ').trim();
};

export const generateFieldSuggestions = (
  tokens: OcrToken[],
  schema: FieldSchema[],
): FieldSuggestion[] => {
  const suggestions: FieldSuggestion[] = [];

  schema.forEach((field) => {
    const hints = FIELD_HINTS[field.key] ?? field.synonyms.map((syn) => new RegExp(syn, 'i'));
    tokens.forEach((token, index) => {
      if (!hints.some((hint) => hint.test(token.text))) return;
      const valueTokens = tokens.slice(index + 1, index + 4);
      if (valueTokens.length === 0) return;
      suggestions.push({
        id: `${field.key}-${token.id}`,
        field_key: field.key,
        value: guessValueFromTokens(tokens, index),
        confidence: 0.72,
        page_number: token.page_number,
        bbox: tokensToBBox([token, ...valueTokens]),
        source: 'pattern',
      });
    });
  });

  return suggestions;
};
