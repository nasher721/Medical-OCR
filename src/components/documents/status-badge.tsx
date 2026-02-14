'use client';

import { DocumentStatus } from '@/lib/supabase/types';

const statusConfig: Record<DocumentStatus, { bg: string; text: string; label: string; dot?: string }> = {
  uploaded: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Uploaded', dot: 'bg-slate-400' },
  processing: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Processing', dot: 'bg-blue-400' },
  needs_review: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Needs Review', dot: 'bg-amber-400' },
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Approved', dot: 'bg-emerald-400' },
  rejected: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Rejected', dot: 'bg-red-400' },
  exported: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Exported', dot: 'bg-purple-400' },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status] || statusConfig.uploaded;
  const isProcessing = status === 'processing';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} ${isProcessing ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}
