'use client';

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let bg = 'bg-green-100 text-green-800';
  if (confidence < 0.80) bg = 'bg-red-100 text-red-800';
  else if (confidence < 0.92) bg = 'bg-yellow-100 text-yellow-800';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}>
      {pct}%
    </span>
  );
}
