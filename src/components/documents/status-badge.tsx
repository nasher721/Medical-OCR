'use client';

import { DocumentStatus } from '@/lib/supabase/types';

const statusConfig: Record<DocumentStatus, { bg: string; text: string; label: string }> = {
  uploaded: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Uploaded' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
  needs_review: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Needs Review' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  exported: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Exported' },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status] || statusConfig.uploaded;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
