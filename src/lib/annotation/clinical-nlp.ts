export type ClinicalEntity = {
  type: string;
  text: string;
  normalized: string;
  value?: string;
};

const NORMALIZATION_MAP: Record<string, string> = {
  na: 'Sodium',
  sodium: 'Sodium',
  k: 'Potassium',
  'k+': 'Potassium',
  potassium: 'Potassium',
  cr: 'Creatinine',
  creatinine: 'Creatinine',
  bp: 'Blood Pressure',
  hr: 'Heart Rate',
};

const MEDICATION_PATTERN = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(\d+\s?(mg|mcg|g|ml))\b/gi;
const LAB_PATTERN = /\b([A-Za-z+]+)\s*[:=]?\s*(\d+\.?\d*)\s*(mg\/dL|mmol\/L|g\/dL|mEq\/L|%)?\b/gi;
const VITAL_PATTERN = /\b(BP|HR|RR|Temp|SpO2)\s*[:=]?\s*([\d/\.]+)\b/gi;
const DATE_PATTERN = /\b(19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/g;

const normalizeTerm = (term: string) => {
  const key = term.toLowerCase();
  return NORMALIZATION_MAP[key] ?? term;
};

export const extractClinicalEntities = (text: string): ClinicalEntity[] => {
  const entities: ClinicalEntity[] = [];

  for (const match of text.matchAll(MEDICATION_PATTERN)) {
    const medication = match[1];
    const dose = match[2];
    entities.push({
      type: 'medication',
      text: `${medication} ${dose}`,
      normalized: medication,
      value: dose,
    });
  }

  for (const match of text.matchAll(LAB_PATTERN)) {
    const raw = match[1];
    const value = match[2];
    const unit = match[3] ?? '';
    entities.push({
      type: 'lab',
      text: `${raw} ${value} ${unit}`.trim(),
      normalized: normalizeTerm(raw),
      value: `${value}${unit ? ` ${unit}` : ''}`,
    });
  }

  for (const match of text.matchAll(VITAL_PATTERN)) {
    const raw = match[1];
    const value = match[2];
    entities.push({
      type: 'vital',
      text: `${raw} ${value}`,
      normalized: normalizeTerm(raw),
      value,
    });
  }

  for (const match of text.matchAll(DATE_PATTERN)) {
    entities.push({
      type: 'date',
      text: match[0],
      normalized: match[0],
    });
  }

  return entities;
};
