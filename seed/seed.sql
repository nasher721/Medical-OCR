-- Seed script for Nanonets IDP SaaS
-- Run this after migrations to set up demo data
-- NOTE: You must first create an admin user via the app's signup page,
-- then use this script to create models and workflows.

-- This script assumes you've already created:
-- 1. A user account via the /login signup form
-- 2. An org was auto-created during signup
-- 3. You have the org_id from the orgs table

-- To use: Replace 'YOUR_ORG_ID' with your actual org UUID, then run via psql or Supabase SQL editor.

-- ================================================
-- INVOICE MODEL + FIELDS
-- ================================================

-- Create Invoice model
INSERT INTO models (id, org_id, name, type, active_version) VALUES
  ('11111111-0000-0000-0000-000000000001', 'YOUR_ORG_ID', 'Invoice', 'invoice', 1);

-- Create version 1
INSERT INTO model_versions (id, model_id, version, schema) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 1, '{"fields": ["invoice_number", "invoice_date", "vendor_name", "total_amount", "tax_amount", "due_date", "po_number", "payment_terms"]}');

-- Create fields
INSERT INTO model_fields (model_version_id, key, label, field_type, required) VALUES
  ('22222222-0000-0000-0000-000000000001', 'invoice_number', 'Invoice Number', 'text', true),
  ('22222222-0000-0000-0000-000000000001', 'invoice_date', 'Invoice Date', 'date', true),
  ('22222222-0000-0000-0000-000000000001', 'vendor_name', 'Vendor Name', 'text', true),
  ('22222222-0000-0000-0000-000000000001', 'total_amount', 'Total Amount', 'number', true),
  ('22222222-0000-0000-0000-000000000001', 'tax_amount', 'Tax Amount', 'number', false),
  ('22222222-0000-0000-0000-000000000001', 'due_date', 'Due Date', 'date', false),
  ('22222222-0000-0000-0000-000000000001', 'po_number', 'PO Number', 'text', false),
  ('22222222-0000-0000-0000-000000000001', 'payment_terms', 'Payment Terms', 'text', false),
  ('22222222-0000-0000-0000-000000000001', 'subtotal', 'Subtotal', 'number', false),
  ('22222222-0000-0000-0000-000000000001', 'currency', 'Currency', 'text', false),
  ('22222222-0000-0000-0000-000000000001', 'vendor_address', 'Vendor Address', 'text', false);

-- ================================================
-- EXAMPLE WORKFLOWS
-- ================================================

-- Workflow 1: Invoice → Extract → Rule(conf>0.92) → Webhook Export
INSERT INTO workflows (id, org_id, name, doc_type) VALUES
  ('33333333-0000-0000-0000-000000000001', 'YOUR_ORG_ID', 'Auto-Process & Export', 'invoice');

INSERT INTO workflow_nodes (workflow_id, node_id, type, position, config) VALUES
  ('33333333-0000-0000-0000-000000000001', 'upload_1', 'upload', '{"x": 250, "y": 0}', '{}'),
  ('33333333-0000-0000-0000-000000000001', 'extract_1', 'extract', '{"x": 250, "y": 120}', '{}'),
  ('33333333-0000-0000-0000-000000000001', 'rule_1', 'rule', '{"x": 250, "y": 240}', '{"threshold": 0.92, "action_pass": "approve", "action_fail": "needs_review"}'),
  ('33333333-0000-0000-0000-000000000001', 'webhook_1', 'webhook_export', '{"x": 250, "y": 360}', '{"url": "", "method": "POST"}');

INSERT INTO workflow_edges (workflow_id, edge_id, source, target) VALUES
  ('33333333-0000-0000-0000-000000000001', 'e1', 'upload_1', 'extract_1'),
  ('33333333-0000-0000-0000-000000000001', 'e2', 'extract_1', 'rule_1'),
  ('33333333-0000-0000-0000-000000000001', 'e3', 'rule_1', 'webhook_1');

-- Workflow 2: Invoice → Extract → Review Required → CSV Export
INSERT INTO workflows (id, org_id, name, doc_type) VALUES
  ('33333333-0000-0000-0000-000000000002', 'YOUR_ORG_ID', 'Review & CSV Export', 'invoice');

INSERT INTO workflow_nodes (workflow_id, node_id, type, position, config) VALUES
  ('33333333-0000-0000-0000-000000000002', 'upload_1', 'upload', '{"x": 250, "y": 0}', '{}'),
  ('33333333-0000-0000-0000-000000000002', 'extract_1', 'extract', '{"x": 250, "y": 120}', '{}'),
  ('33333333-0000-0000-0000-000000000002', 'review_1', 'review', '{"x": 250, "y": 240}', '{}'),
  ('33333333-0000-0000-0000-000000000002', 'csv_1', 'csv_export', '{"x": 250, "y": 360}', '{}');

INSERT INTO workflow_edges (workflow_id, edge_id, source, target) VALUES
  ('33333333-0000-0000-0000-000000000002', 'e1', 'upload_1', 'extract_1'),
  ('33333333-0000-0000-0000-000000000002', 'e2', 'extract_1', 'review_1'),
  ('33333333-0000-0000-0000-000000000002', 'e3', 'review_1', 'csv_1');

-- Workflow 3: Invoice → Extract → Rule(conf>0.90) → Auto-approve else Review
INSERT INTO workflows (id, org_id, name, doc_type) VALUES
  ('33333333-0000-0000-0000-000000000003', 'YOUR_ORG_ID', 'Smart Routing', 'invoice');

INSERT INTO workflow_nodes (workflow_id, node_id, type, position, config) VALUES
  ('33333333-0000-0000-0000-000000000003', 'upload_1', 'upload', '{"x": 250, "y": 0}', '{}'),
  ('33333333-0000-0000-0000-000000000003', 'extract_1', 'extract', '{"x": 250, "y": 120}', '{}'),
  ('33333333-0000-0000-0000-000000000003', 'rule_1', 'rule', '{"x": 250, "y": 240}', '{"threshold": 0.90, "action_pass": "approve", "action_fail": "needs_review"}'),
  ('33333333-0000-0000-0000-000000000003', 'review_1', 'review', '{"x": 250, "y": 360}', '{}');

INSERT INTO workflow_edges (workflow_id, edge_id, source, target) VALUES
  ('33333333-0000-0000-0000-000000000003', 'e1', 'upload_1', 'extract_1'),
  ('33333333-0000-0000-0000-000000000003', 'e2', 'extract_1', 'rule_1'),
  ('33333333-0000-0000-0000-000000000003', 'e3', 'rule_1', 'review_1');
