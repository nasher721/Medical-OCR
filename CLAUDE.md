# CLAUDE.md - AI Assistant Guide for Medical-OCR

## Project Overview

Medical-OCR is a **Nanonets-style Intelligent Document Processing (IDP) SaaS platform** built for medical records and business documents. It provides document upload, automatic field extraction with confidence scores and bounding boxes, human-in-the-loop review, visual workflow automation, and multi-tenant organization management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) with TypeScript (strict mode) |
| UI | React 18, shadcn/ui (Radix UI primitives), Tailwind CSS 3 |
| State | Zustand 5 |
| Database | Supabase (Postgres 15) with Row Level Security |
| Auth | Supabase Auth (email/password, JWT cookies) |
| Storage | Supabase Storage (documents bucket, 50 MB limit) |
| Visualization | React Flow 11 (workflow builder), Recharts 3 (analytics) |
| Package Manager | npm |

## Commands

```bash
npm run dev      # Start Next.js dev server on localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check (next lint)
```

### Database Setup (Local)

```bash
npx supabase start          # Start local Postgres, Auth, Storage (ports 54321-54323)
npx supabase db reset        # Run migrations + reset schema
cp .env.local.example .env.local  # Then fill in Supabase URL/keys
```

### Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase API URL (default: `http://localhost:54321`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

## Project Structure

```
src/
├── app/
│   ├── api/                         # Next.js API routes (RESTful JSON)
│   │   ├── documents/               # CRUD + process/approve/reject/fields/comments
│   │   ├── models/                  # Extraction model schemas
│   │   ├── workflows/               # Workflow execution
│   │   ├── analytics/               # KPI data
│   │   ├── audit-logs/              # Audit trail
│   │   ├── api-keys/                # API key management
│   │   ├── export-csv/              # CSV export
│   │   └── webhook-receiver/        # Test webhook endpoint
│   ├── app/                         # Protected app pages (requires auth)
│   │   ├── dashboard/               # KPI overview
│   │   ├── documents/               # Upload, list, review
│   │   ├── models/                  # Schema management + versioning
│   │   ├── workflows/               # Visual workflow builder (React Flow)
│   │   ├── analytics/               # Charts and metrics
│   │   ├── integrations/            # Webhooks, API keys, tester
│   │   ├── settings/                # Org, users, audit logs
│   │   └── layout.tsx               # Sidebar layout for all /app/* pages
│   ├── login/                       # Sign in / Sign up page
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Landing page (redirects to /login or /app)
├── components/
│   ├── ui/                          # shadcn/ui primitives (button, dialog, tabs, etc.)
│   ├── documents/                   # Upload widget, status badges
│   └── review/                      # Document viewer, field editor, comments
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # createBrowserClient() - client-side
│   │   ├── server.ts                # createServerSupabaseClient(), createServiceClient()
│   │   ├── middleware.ts            # updateSession() for auth cookie refresh
│   │   └── types.ts                 # All data models + Database interface (18 tables)
│   ├── extraction/
│   │   ├── types.ts                 # ExtractionProvider interface
│   │   ├── mock-provider.ts         # Mock OCR (deterministic, filename-based)
│   │   └── index.ts                 # Provider swap point (change one line for real OCR)
│   ├── workflow-engine/
│   │   ├── types.ts                 # WorkflowNodeType, configs
│   │   ├── executor.ts              # WorkflowExecutor (topological sort, DAG execution)
│   │   └── index.ts                 # Exports
│   ├── hooks/
│   │   ├── use-org.ts               # useOrgStore (Zustand), useOrg() hook
│   │   └── use-user.ts              # useUser() hook
│   └── utils.ts                     # cn() className helper (clsx + tailwind-merge)
├── middleware.ts                     # Auth middleware (session refresh on all routes)
supabase/
├── migrations/
│   └── 00001_initial_schema.sql     # Full schema: 18 tables, RLS policies, indexes
├── config.toml                      # Local Supabase config (ports, auth, storage)
seed/
├── seed.sql                         # Sample models/workflows for dev
└── docs/                            # Sample invoice HTML
```

## Architecture

### Data Flow

```
Client Component → API Route → Server Supabase Client → Postgres (with RLS)
```

### Multi-Tenancy

- All data is scoped to organizations (`org_id` foreign key on every table)
- RLS policies enforce org isolation at the database level using `auth.user_org_ids()`
- Four roles: `admin` > `reviewer` > `member` > `viewer`
- Role checks via `auth.user_org_role(org_id)` SQL function

### Extraction Provider System

The extraction system uses a pluggable provider interface at `src/lib/extraction/`:
- `ExtractionProvider` interface defines the contract (`extract()` method)
- Currently uses `MockExtractionProvider` (deterministic mock based on filename hash)
- Swap to a real provider (Textract, Google Vision, etc.) by editing `index.ts`

### Document Lifecycle

`uploaded` → `processing` → `needs_review` → `approved` / `rejected` → `exported`

- Auto-approval threshold: confidence >= 0.90 (skips review)
- Field corrections stored as `training_examples` for model improvement

### Workflow Engine

- Visual DAG builder using React Flow
- Node types: Extract, Rule, Review, Webhook Export, CSV Export, Notify
- Executor runs topological sort, logs each step to `workflow_logs`

## Code Conventions

### TypeScript

- Strict mode enabled (`tsconfig.json`)
- Path alias: `@/*` maps to `./src/*`
- Use `import type` for type-only imports
- All data models defined in `src/lib/supabase/types.ts`

### React / Next.js

- Server Components by default; add `"use client"` only when needed for interactivity
- Pages: `page.tsx`, Layouts: `layout.tsx` (Next.js App Router conventions)
- Component names: PascalCase (e.g., `StatusBadge`, `DocumentViewer`)
- Functional components with hooks only (no class components)

### Styling

- Tailwind CSS utility classes throughout
- CSS variables for theming (HSL color system in `tailwind.config.ts`)
- `cn()` helper from `src/lib/utils.ts` for conditional classNames
- Dark mode support via `darkMode: ["class"]`
- shadcn/ui components in `src/components/ui/` - do not modify these directly

### API Routes

- RESTful JSON endpoints under `src/app/api/`
- Auth: all routes verify Supabase session; return 401 if unauthorized
- Pagination: `?page=1&limit=20` query params; response includes `total`, `page`, `limit`
- Filtering: query params (e.g., `?status=needs_review&search=invoice`)
- Error responses: `{ "error": "message" }` with appropriate HTTP status
- Use `createServerSupabaseClient()` for user-scoped queries, `createServiceClient()` for admin operations

### Database

- Snake_case for table and column names (Postgres convention)
- UUID primary keys on all tables
- Timestamps: `created_at`, `updated_at` (TIMESTAMPTZ with defaults)
- Foreign keys with CASCADE or SET NULL
- RLS enabled on every table - never bypass in application code

## Key Extension Points

1. **OCR Provider**: Implement `ExtractionProvider` interface, swap in `src/lib/extraction/index.ts`
2. **Workflow Nodes**: Add new node types in `src/lib/workflow-engine/types.ts` and handlers in `executor.ts`
3. **Integrations**: Webhook configs stored in `integrations` table, extend via API routes
4. **Document Types**: Add new `doc_type` values and corresponding model field schemas

## Known Limitations

- No automated tests (no Jest/Vitest/RTL configured)
- No CI/CD pipeline
- OCR extraction uses mock provider (no real OCR)
- Email notifications (notify workflow node) is a stub
- No WebSocket/real-time updates
- No rate limiting on API routes

## Webpack Note

Canvas is aliased to `false` in `next.config.mjs` to prevent bundling issues with PDF rendering libraries.
