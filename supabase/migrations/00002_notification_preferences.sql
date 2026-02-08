-- =============================================
-- Notification preferences
-- =============================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  document_approved BOOLEAN NOT NULL DEFAULT true,
  needs_review BOOLEAN NOT NULL DEFAULT true,
  workflow_error BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_notification_preferences_org ON notification_preferences(org_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view notification preferences" ON notification_preferences
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));

CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND org_id IN (SELECT auth.user_org_ids())
  );

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());
