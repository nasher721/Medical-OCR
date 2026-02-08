'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrgStore } from '@/lib/hooks/use-org';
import type { Membership, AuditLog, ApiKey, Invitation } from '@/lib/supabase/types';
import { Settings, Users, Key, FileText, Copy, Trash2, Plus, ChevronLeft, ChevronRight, Mail } from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const { currentOrg } = useOrgStore();
  const [activeTab, setActiveTab] = useState<'org' | 'users' | 'api_keys' | 'audit_logs' | 'notifications'>('org');
  const [orgName, setOrgName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);

  // Users
  const [members, setMembers] = useState<(Membership & { profile?: { display_name: string } })[]>([]);
  const [invitations, setInvitations] = useState<Omit<Invitation, 'token_hash'>[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteSending, setInviteSending] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  // Notification preferences
  const [notificationPrefId, setNotificationPrefId] = useState<string | null>(null);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notifyDocumentApproved, setNotifyDocumentApproved] = useState(true);
  const [notifyNeedsReview, setNotifyNeedsReview] = useState(true);
  const [notifyWorkflowError, setNotifyWorkflowError] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    setOrgName(currentOrg.name);
    fetchMembers();
    fetchInvitations();
    fetchApiKeys();
    fetchAuditLogs();
    fetchNotificationPreferences();
    void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [currentOrg]);

  const fetchMembers = async () => {
    if (!currentOrg) return;
    const { data: memberData } = await supabase.from('memberships').select('*').eq('org_id', currentOrg.id);
    const memberList = memberData || [];
    const memberIds = memberList.map(member => member.user_id);
    let profiles: Record<string, { display_name: string }> = {};
    if (memberIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', memberIds);
      profiles = (profileData || []).reduce((acc, profile) => {
        acc[profile.user_id] = { display_name: profile.display_name };
        return acc;
      }, {} as Record<string, { display_name: string }>);
    }
    setMembers(
      memberList.map(member => ({
        ...member,
        profile: profiles[member.user_id],
      }))
    );
  };

  const fetchInvitations = async () => {
    if (!currentOrg) return;
    const resp = await fetch(`/api/invitations?org_id=${currentOrg.id}`);
    if (resp.ok) {
      const data = await resp.json();
      setInvitations(data.data || []);
    }
  };

  const fetchApiKeys = async () => {
    if (!currentOrg) return;
    const resp = await fetch(`/api/api-keys?org_id=${currentOrg.id}`);
    if (resp.ok) { const data = await resp.json(); setApiKeys(data.data || []); }
  };

  const fetchAuditLogs = async () => {
    if (!currentOrg) return;
    const resp = await fetch(`/api/audit-logs?org_id=${currentOrg.id}&page=${auditPage}&limit=20`);
    if (resp.ok) { const data = await resp.json(); setAuditLogs(data.data || []); setAuditTotal(data.total || 0); }
  };

  useEffect(() => { if (currentOrg && activeTab === 'audit_logs') fetchAuditLogs(); }, [auditPage]);

  const fetchNotificationPreferences = async () => {
    if (!currentOrg) return;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('org_id', currentOrg.id)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (data) {
      setNotificationPrefId(data.id);
      setNotificationEmail(data.email);
      setNotifyDocumentApproved(data.document_approved);
      setNotifyNeedsReview(data.needs_review);
      setNotifyWorkflowError(data.workflow_error);
    } else {
      setNotificationPrefId(null);
      setNotificationEmail(user.email || '');
      setNotifyDocumentApproved(true);
      setNotifyNeedsReview(true);
      setNotifyWorkflowError(true);
    }
  };

  const handleSaveNotifications = async () => {
    if (!currentOrg) return;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    setNotificationSaving(true);
    const payload = {
      org_id: currentOrg.id,
      user_id: user.id,
      email: notificationEmail || user.email || '',
      document_approved: notifyDocumentApproved,
      needs_review: notifyNeedsReview,
      workflow_error: notifyWorkflowError,
    };

    if (notificationPrefId) {
      await supabase.from('notification_preferences').update(payload).eq('id', notificationPrefId);
    } else {
      const { data } = await supabase.from('notification_preferences').insert(payload).select().single();
      if (data?.id) setNotificationPrefId(data.id);
    }
    setNotificationSaving(false);
  };

  const handleSaveOrg = async () => {
    if (!currentOrg) return;
    setSaving(true);
    await supabase.from('orgs').update({ name: orgName }).eq('id', currentOrg.id);
    setSaving(false);
  };

  const handleCreateKey = async () => {
    if (!currentOrg || !newKeyName.trim()) return;
    const resp = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: currentOrg.id, name: newKeyName }),
    });
    if (resp.ok) {
      const { data } = await resp.json();
      setNewRawKey(data.raw_key);
      setNewKeyName('');
      fetchApiKeys();
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    await fetch(`/api/api-keys?id=${keyId}`, { method: 'DELETE' });
    fetchApiKeys();
  };

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    await supabase.from('memberships').update({ role: newRole }).eq('id', membershipId);
    fetchMembers();
  };

  const handleRemoveMember = async (membershipId: string) => {
    const confirmed = window.confirm('Remove this member from the organization?');
    if (!confirmed) return;
    await supabase.from('memberships').delete().eq('id', membershipId);
    fetchMembers();
  };

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) return;
    setInviteSending(true);
    const resp = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: currentOrg.id, email: inviteEmail.trim(), role: inviteRole }),
    });
    if (resp.ok) {
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      fetchInvitations();
    }
    setInviteSending(false);
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!currentOrg) return;
    const resp = await fetch('/api/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inviteId, org_id: currentOrg.id }),
    });
    if (resp.ok) fetchInvitations();
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!currentOrg) return;
    const confirmed = window.confirm('Revoke this invitation?');
    if (!confirmed) return;
    const resp = await fetch(`/api/invitations?id=${inviteId}&org_id=${currentOrg.id}`, { method: 'DELETE' });
    if (resp.ok) fetchInvitations();
  };

  const tabs = [
    { id: 'org' as const, label: 'Organization', icon: Settings },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'api_keys' as const, label: 'API Keys', icon: Key },
    { id: 'audit_logs' as const, label: 'Audit Logs', icon: FileText },
    { id: 'notifications' as const, label: 'Notifications', icon: Mail },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Organization */}
          {activeTab === 'org' && (
            <div className="max-w-lg">
              <h2 className="mb-4 text-lg font-semibold">Organization Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Organization Name</label>
                  <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Organization ID</label>
                  <input type="text" value={currentOrg?.id || ''} readOnly className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground" />
                </div>
                <button onClick={handleSaveOrg} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Team Members</h2>
                <button
                  onClick={() => setShowInviteForm(prev => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" /> Invite User
                </button>
              </div>
              {showInviteForm && (
                <div className="mb-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-medium">Email</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="teammate@company.com"
                        className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Role</label>
                      <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                        <option value="admin">Admin</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <button
                      onClick={handleInvite}
                      disabled={inviteSending || !inviteEmail.trim()}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {inviteSending ? 'Sending...' : 'Send Invite'}
                    </button>
                    <button onClick={() => setShowInviteForm(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left text-sm font-medium">User</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Role</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Joined</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} className="border-b">
                        <td className="px-4 py-2 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {m.profile?.display_name || `${m.user_id.slice(0, 8)}...`}
                            </span>
                            <span className="text-xs text-muted-foreground">{m.user_id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)} className="rounded border px-2 py-1 text-sm">
                            <option value="admin">Admin</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            disabled={currentUserId === m.user_id}
                            className="text-sm font-medium text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Pending Invitations</h3>
                <div className="rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Role</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Expires</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No pending invitations
                          </td>
                        </tr>
                      ) : (
                        invitations.map(invite => (
                          <tr key={invite.id} className="border-b">
                            <td className="px-4 py-2 text-sm">{invite.email}</td>
                            <td className="px-4 py-2 text-sm capitalize">{invite.role}</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{new Date(invite.expires_at).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleResendInvite(invite.id)} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                  Resend
                                </button>
                                <button onClick={() => handleRevokeInvite(invite.id)} className="text-sm font-medium text-red-500 hover:text-red-700">
                                  Revoke
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeTab === 'api_keys' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">API Keys</h2>
                <button onClick={() => { setShowCreateKey(true); setNewRawKey(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-3.5 w-3.5" /> Generate Key
                </button>
              </div>

              {newRawKey && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="mb-2 text-sm font-medium text-green-800">New API Key (copy now - shown only once):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono">{newRawKey}</code>
                    <button onClick={() => navigator.clipboard.writeText(newRawKey)} className="rounded p-2 hover:bg-green-100"><Copy className="h-4 w-4" /></button>
                  </div>
                </div>
              )}

              {showCreateKey && !newRawKey && (
                <div className="mb-4 rounded-lg border p-4">
                  <div className="flex gap-3">
                    <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name" className="flex-1 rounded-lg border border-input px-3 py-2 text-sm" />
                    <button onClick={handleCreateKey} disabled={!newKeyName.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Generate</button>
                    <button onClick={() => setShowCreateKey(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left text-sm font-medium">Name</th><th className="px-4 py-2 text-left text-sm font-medium">Prefix</th><th className="px-4 py-2 text-left text-sm font-medium">Created</th><th className="px-4 py-2 text-right text-sm font-medium">Actions</th></tr></thead>
                  <tbody>
                    {apiKeys.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No API keys yet</td></tr>
                    ) : apiKeys.map(k => (
                      <tr key={k.id} className="border-b">
                        <td className="px-4 py-2 text-sm font-medium">{k.name}</td>
                        <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{k.prefix}...</td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{new Date(k.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleDeleteKey(k.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          {activeTab === 'audit_logs' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Audit Logs</h2>
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left text-sm font-medium">Action</th><th className="px-4 py-2 text-left text-sm font-medium">Entity</th><th className="px-4 py-2 text-left text-sm font-medium">Timestamp</th></tr></thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">No audit logs</td></tr>
                    ) : auditLogs.map(log => (
                      <tr key={log.id} className="border-b">
                        <td className="px-4 py-2 text-sm font-medium">{log.action.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{log.entity_type} {log.entity_id?.slice(0, 8)}</td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Math.ceil(auditTotal / 20) > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-2">
                    <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className="rounded p-1.5 hover:bg-muted disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                    <span className="text-sm">{auditPage} / {Math.ceil(auditTotal / 20)}</span>
                    <button onClick={() => setAuditPage(p => p + 1)} disabled={auditPage >= Math.ceil(auditTotal / 20)} className="rounded p-1.5 hover:bg-muted disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="mb-1 text-lg font-semibold">Email Notifications</h2>
                <p className="text-sm text-muted-foreground">Choose which workflow events should trigger email alerts.</p>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Notification Email</label>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={e => setNotificationEmail(e.target.value)}
                    placeholder="alerts@yourcompany.com"
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">This address will receive workflow alerts.</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notifyDocumentApproved}
                      onChange={e => setNotifyDocumentApproved(e.target.checked)}
                      className="h-4 w-4 rounded border"
                    />
                    Document approved
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notifyNeedsReview}
                      onChange={e => setNotifyNeedsReview(e.target.checked)}
                      className="h-4 w-4 rounded border"
                    />
                    Document needs review
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notifyWorkflowError}
                      onChange={e => setNotifyWorkflowError(e.target.checked)}
                      className="h-4 w-4 rounded border"
                    />
                    Workflow error
                  </label>
                </div>

                <button
                  onClick={handleSaveNotifications}
                  disabled={notificationSaving || !notificationEmail}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {notificationSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
