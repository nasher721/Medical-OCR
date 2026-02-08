'use client';

import type { TableExtraction } from '@/lib/annotation/table-extraction';

interface TableExtractionPanelProps {
  table: TableExtraction | null;
  onExport: () => void;
}

export function TableExtractionPanel({ table, onExport }: TableExtractionPanelProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Table extraction</div>
          <div className="text-xs text-muted-foreground">Draw a box around a table to convert it into rows.</div>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
        >
          Export table JSON
        </button>
      </div>
      <div className="mt-4 overflow-x-auto">
        {table && table.rows.length > 0 ? (
          <table className="w-full text-xs">
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b last:border-none">
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} className="px-2 py-1">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground">No table detected yet.</p>
        )}
      </div>
    </div>
  );
}
