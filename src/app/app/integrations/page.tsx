'use client';

import Link from 'next/link';
import { Webhook, Mail, Code, FileDown, ExternalLink } from 'lucide-react';

const integrations = [
  {
    id: 'webhook',
    name: 'Webhook Export',
    description: 'Send extracted data to any endpoint via HTTP POST',
    icon: Webhook,
    color: 'bg-purple-100 text-purple-600',
    status: 'Available',
    link: '/app/integrations/webhook-tester',
  },
  {
    id: 'api',
    name: 'REST API',
    description: 'Access documents and extractions via API',
    icon: Code,
    color: 'bg-blue-100 text-blue-600',
    status: 'Available',
  },
  {
    id: 'csv',
    name: 'CSV Export',
    description: 'Download extracted fields as CSV files',
    icon: FileDown,
    color: 'bg-green-100 text-green-600',
    status: 'Available',
  },
  {
    id: 'email',
    name: 'Email Notifications',
    description: 'Send email alerts for document processing events',
    icon: Mail,
    color: 'bg-orange-100 text-orange-600',
    status: 'Coming Soon',
  },
];

export default function IntegrationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect your document processing pipeline to external services</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map(integration => (
          <div key={integration.id} className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${integration.color}`}>
                <integration.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{integration.name}</h3>
                <p className="text-xs text-muted-foreground">{integration.description}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                integration.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {integration.status}
              </span>
            </div>
            {integration.link && (
              <Link href={integration.link} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Open Tester <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-muted/30 p-6">
        <h3 className="mb-2 font-semibold">API Endpoint</h3>
        <p className="mb-3 text-sm text-muted-foreground">Use the REST API to programmatically manage documents and extractions.</p>
        <div className="rounded-lg bg-slate-900 p-4 text-sm font-mono text-green-400">
          <p>POST /api/documents - Upload document</p>
          <p>GET  /api/documents?org_id=... - List documents</p>
          <p>POST /api/documents/:id/process - Process document</p>
          <p>POST /api/documents/:id/approve - Approve document</p>
          <p>GET  /api/export-csv/:id - Export as CSV</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          API keys can be managed in <Link href="/app/settings" className="text-primary hover:underline">Settings</Link>.
        </p>
      </div>
    </div>
  );
}
