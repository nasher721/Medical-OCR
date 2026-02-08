import type { OcrToken } from '@/lib/supabase/types';

export type TableCell = {
  row: number;
  column: number;
  text: string;
};

export type TableExtraction = {
  rows: string[][];
  cells: TableCell[];
};

const groupBy = <T,>(items: T[], keyFn: (item: T) => string) => {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  });
  return map;
};

export const extractTableFromTokens = (tokens: OcrToken[]): TableExtraction => {
  if (tokens.length === 0) {
    return { rows: [], cells: [] };
  }

  const sorted = [...tokens].sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);
  const rowGroups = groupBy(sorted, (token) => `${Math.round(token.bbox.y * 100)}`);
  const rowKeys = Array.from(rowGroups.keys()).sort((a, b) => Number(a) - Number(b));

  const rows: string[][] = [];
  const cells: TableCell[] = [];

  rowKeys.forEach((rowKey, rowIndex) => {
    const rowTokens = rowGroups.get(rowKey) ?? [];
    rowTokens.sort((a, b) => a.bbox.x - b.bbox.x);
    const colGroups = groupBy(rowTokens, (token) => `${Math.round(token.bbox.x * 100)}`);
    const colKeys = Array.from(colGroups.keys()).sort((a, b) => Number(a) - Number(b));
    const rowValues: string[] = [];

    colKeys.forEach((colKey, colIndex) => {
      const colTokens = colGroups.get(colKey) ?? [];
      const text = colTokens.map((token) => token.text).join(' ');
      rowValues.push(text);
      cells.push({ row: rowIndex, column: colIndex, text });
    });

    rows.push(rowValues);
  });

  return { rows, cells };
};
