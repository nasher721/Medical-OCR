'use client';

import type { ClinicalEntity } from '@/lib/annotation/clinical-nlp';

interface ClinicalEntityPanelProps {
  entities: ClinicalEntity[];
}

export function ClinicalEntityPanel({ entities }: ClinicalEntityPanelProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Clinical NLP layer</div>
      <div className="text-xs text-muted-foreground">Normalized to clinical concepts & FHIR-ready labels.</div>
      <div className="mt-3 space-y-2">
        {entities.map((entity, index) => (
          <div key={`${entity.type}-${index}`} className="rounded-md border px-3 py-2 text-xs">
            <div className="font-semibold uppercase text-slate-500">{entity.type}</div>
            <div className="text-sm text-slate-800">{entity.text}</div>
            <div className="text-xs text-slate-500">Normalized: {entity.normalized}</div>
            {entity.value && <div className="text-xs text-slate-500">Value: {entity.value}</div>}
          </div>
        ))}
        {entities.length === 0 && <p className="text-xs text-muted-foreground">No clinical entities detected yet.</p>}
      </div>
    </div>
  );
}
