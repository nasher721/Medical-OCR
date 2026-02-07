# Medical OCR - Intelligent Document Processing SaaS

A Nanonets-style IDP (Intelligent Document Processing) platform built with Next.js, Supabase, and React Flow. Upload documents, extract fields with AI, review with human-in-the-loop, automate with visual workflows, and export data.

## Features

- **Document Processing**: Upload PDFs/images, automatic field extraction with confidence scores and bounding boxes
- **Human-in-the-Loop Review**: Split-screen document viewer with bbox overlay, inline field editing, approve/reject workflow
- **Extraction Models**: Define field schemas, versioning, training examples from corrections
- **Visual Workflow Builder**: React Flow-based no-code workflow editor with Extract, Rule, Review, Webhook Export, CSV Export nodes
- **Multi-tenant**: Organization-based isolation with role-based access (admin, reviewer, member, viewer)
- **Analytics**: Documents processed/day, STP rate, avg review time, field edit rates
- **Integrations**: Webhook export (real POST), CSV export, API keys, webhook tester
- **Audit Logging**: Full audit trail of all document actions

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI**: shadcn/ui components + Radix UI primitives
- **Workflow Builder**: React Flow
- **Charts**: Recharts
- **Backend**: Supabase (Auth, Postgres, Storage, Edge Functions)
- **Data Access**: supabase-js with typed models

## Architecture

```
src/
├── app/
│   ├── api/              # Next.js API routes
│   ├── app/              # Protected app pages (with sidebar layout)
│   │   ├── dashboard/    # KPI overview
│   │   ├── documents/    # Document list + [id] review screen
│   │   ├── models/       # Model schema + training
│   │   ├── workflows/    # Workflow list + [id] visual builder
│   │   ├── analytics/    # Charts and metrics
│   │   ├── integrations/ # Integration cards + webhook tester
│   │   └── settings/     # Org, users, API keys, audit logs
│   └── login/            # Auth page
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── documents/        # Status badges, upload dialog
│   ├── review/           # Document viewer, field list, confidence badges
│   └── workflows/        # (workflow-specific components)
├── lib/
│   ├── supabase/         # Client, server, middleware, types
│   ├── extraction/       # Provider interface + mock extractor
│   └── workflow-engine/  # Workflow executor + types
supabase/
├── migrations/           # SQL schema + RLS policies
└── functions/            # Edge functions (process-document, run-workflow)
seed/
├── docs/                 # Sample invoice HTML files
├── seed.sql              # Seed data (models, workflows)
└── create-seed-invoices.ts
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI (`npx supabase`) or a Supabase project

### 1. Clone and Install

```bash
git clone <repo-url>
cd Medical-OCR
npm install
```

### 2. Supabase Setup

**Option A: Local Supabase (recommended for dev)**

```bash
npx supabase start
# Note the API URL and anon key from the output
```

**Option B: Supabase Cloud**

1. Create a project at [supabase.com](https://supabase.com)
2. Note your project URL and anon key from Settings > API

### 3. Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321  # or your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Migrations

```bash
# Local Supabase
npx supabase db reset

# Cloud Supabase - run the SQL in supabase/migrations/00001_initial_schema.sql
# via the SQL Editor in the Supabase Dashboard
```

### 5. Run the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 6. First-Time Setup

1. Navigate to `/login`
2. Click "Sign up" and create an account with an organization name
3. You'll be redirected to the dashboard
4. Upload documents, create models, build workflows

### 7. Seed Data (Optional)

After creating your org, edit `seed/seed.sql` and replace `YOUR_ORG_ID` with your actual org UUID, then run the SQL to create:
- An Invoice extraction model with standard fields
- Three example workflows (Auto-Process, Review & Export, Smart Routing)

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

## Swapping the OCR Provider

The extraction pipeline is designed to be pluggable. To swap from the mock provider to a real OCR service:

1. Create a new provider file: `src/lib/extraction/your-provider.ts`
2. Implement the `ExtractionProvider` interface:

```typescript
import type { ExtractionProvider, ExtractionResult } from './types';

export class YourProvider implements ExtractionProvider {
  async extract(document: { filename: string; content?: ArrayBuffer; mime_type: string }): Promise<ExtractionResult> {
    // Call your OCR API (Textract, Google Vision, Tesseract, etc.)
    // Return: { full_text, fields: [{ key, value, confidence, bbox, page }], tables? }
  }
}
```

3. Update `src/lib/extraction/index.ts`:

```typescript
import { YourProvider } from './your-provider';

export function getExtractionProvider(): ExtractionProvider {
  return new YourProvider();
}
```

That's it - one file change to swap providers.

## Key Design Decisions

- **Mock Extraction**: Uses filename-based deterministic extraction for consistent demo results
- **RLS Everywhere**: All tables have Row Level Security policies for org isolation
- **Pluggable Architecture**: Extraction provider, workflow nodes, and integrations are all modular
- **Audit Trail**: Every action creates an audit log entry
- **Training Loop**: Field corrections during review are stored as training examples
- **Workflow Engine**: Topological sort execution with step-by-step logging

## Document Status Flow

```
uploaded → processing → needs_review → approved → exported
                     ↘ approved (auto)  ↗
                     → rejected
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/documents` | List/create documents |
| GET | `/api/documents/[id]` | Get document with extraction |
| POST | `/api/documents/[id]/process` | Run extraction |
| POST | `/api/documents/[id]/approve` | Approve document |
| POST | `/api/documents/[id]/reject` | Reject document |
| PATCH | `/api/documents/[id]/fields` | Edit extraction field |
| POST | `/api/documents/[id]/comments` | Add review comment |
| GET | `/api/export-csv/[id]` | Export as CSV |
| GET/POST | `/api/models` | List/create models |
| GET/PATCH | `/api/models/[id]` | Get/update model |
| POST | `/api/workflows/[id]/run` | Run workflow |
| GET | `/api/analytics` | Get analytics data |
| GET | `/api/audit-logs` | Get audit logs |
| GET/POST/DELETE | `/api/api-keys` | Manage API keys |
| POST | `/api/webhook-receiver` | Receive webhook payloads |
