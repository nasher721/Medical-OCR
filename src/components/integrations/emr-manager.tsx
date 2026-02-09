"use client";

import { useState, useEffect } from "react";
import { useOrgStore } from "@/lib/hooks/use-org";
import { Loader2, CheckCircle2, XCircle, Save, EthernetPort, RefreshCw, Database } from "lucide-react";

interface EmrConfig {
    provider: 'epic' | 'cerner' | 'fhir_generic';
    baseUrl: string;
    clientId: string;
    clientSecret: string;
}

export function EmrManager() {
    const { currentOrg } = useOrgStore();
    const [config, setConfig] = useState<EmrConfig>({
        provider: 'fhir_generic',
        baseUrl: '',
        clientId: '',
        clientSecret: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (currentOrg) fetchConfig();
    }, [currentOrg]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`/api/integrations/emr?org_id=${currentOrg!.id}`);
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    setConfig(json.data.config);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/integrations/emr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    org_id: currentOrg!.id,
                    name: `${config.provider.toUpperCase()} Integration`,
                    config
                })
            });
            setTestResult(null); // Clear previous test result on save
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/integrations/emr/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });
            const json = await res.json();
            setTestResult(json);
        } catch (e) {
            setTestResult({ success: false, message: 'Network error occurred' });
        } finally {
            setTesting(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/integrations/emr/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ org_id: currentOrg!.id })
            });
            const json = await res.json();
            if (json.success) {
                alert("Sync started successfully");
            }
        } catch (e) {
            alert("Failed to start sync");
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div className="py-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex items-center gap-3 border-b pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Database className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">EMR Configuration</h2>
                        <p className="text-sm text-muted-foreground">Connect to your Electronic Medical Record system via FHIR.</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Provider</label>
                            <select
                                value={config.provider}
                                onChange={e => setConfig({ ...config, provider: e.target.value as any })}
                                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                            >
                                <option value="fhir_generic">Generic FHIR (R4)</option>
                                <option value="epic">Epic Systems</option>
                                <option value="cerner">Oracle Cerner</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">FHIR Base URL</label>
                            <input
                                type="url"
                                value={config.baseUrl}
                                onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                                placeholder="https://fhir.example.com/r4"
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Client ID</label>
                            <input
                                type="text"
                                value={config.clientId}
                                onChange={e => setConfig({ ...config, clientId: e.target.value })}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Client Secret</label>
                            <input
                                type="password"
                                value={config.clientSecret}
                                onChange={e => setConfig({ ...config, clientSecret: e.target.value })}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Configuration
                            </button>
                            <button
                                onClick={handleTest}
                                disabled={testing || !config.baseUrl}
                                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                            >
                                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <EthernetPort className="h-4 w-4" />}
                                Test Connection
                            </button>
                        </div>

                        {testResult && (
                            <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {testResult.success ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
                                <div>
                                    <p className="font-semibold">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</p>
                                    <p>{testResult.message}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-4">
                        <h3 className="mb-2 font-medium">Data Synchronization</h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Manually trigger a sync to pull patient demographics from the connected EMR.
                            Scheduled syncs run every 24 hours.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-md border bg-background p-3">
                                <div>
                                    <p className="text-sm font-medium">Patients</p>
                                    <p className="text-xs text-muted-foreground">Last synced: Never</p>
                                </div>
                                <button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                                    {syncing ? 'Syncing...' : 'Sync Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
