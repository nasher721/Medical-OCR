-- =============================================
-- Medical Annotation & Learning Loop Schema
-- =============================================

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  width NUMERIC NOT NULL DEFAULT 0,
  height NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, page_number)
);

CREATE TABLE IF NOT EXISTS ocr_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  text TEXT NOT NULL,
  bbox JSONB NOT NULL,
  line_number INT,
  block_number INT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  field_key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  bbox JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'corrected', 'rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_schema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  repeating BOOLEAN NOT NULL DEFAULT false,
  synonyms JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

CREATE TABLE IF NOT EXISTS model_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  annotation_id UUID REFERENCES annotations(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('accept', 'correct', 'reject')),
  previous_value TEXT,
  corrected_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS structured_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS idx_ocr_tokens_document_page ON ocr_tokens(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_annotations_document ON annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_field_schema_org ON field_schema(org_id);
