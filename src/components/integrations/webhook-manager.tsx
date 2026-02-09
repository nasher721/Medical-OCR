"use client";

import { useEffect, useState } from "react";
import { IntegrationService } from "@/lib/services/integration-service";
import { Integration } from "@/lib/supabase/types";
import { useOrgStore } from "@/lib/hooks/use-org";
import { Plus, Trash2, Webhook, CheckCircle2, AlertCircle, Play, MoreHorizontal, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WebhookManager() {
    const { currentOrg } = useOrgStore();
    const [webhooks, setWebhooks] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [testing, setTesting] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [events, setEvents] = useState<string[]>(["document.approved"]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const availableEvents = [
        { id: "document.uploaded", label: "Document Uploaded" },
        { id: "document.approved", label: "Document Approved" },
        { id: "document.rejected", label: "Document Rejected" },
        { id: "document.needs_review", label: "Needs Review" },
        { id: "workflow.completed", label: "Workflow Completed" },
        { id: "workflow.failed", label: "Workflow Failed" },
    ];

    useEffect(() => {
        if (currentOrg) fetchWebhooks();
    }, [currentOrg]);

    const fetchWebhooks = async () => {
        if (!currentOrg) return;
        try {
            const integrations = await IntegrationService.list(currentOrg.id);
            setWebhooks(integrations.filter((i) => i.type === "webhook"));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg) return;

        const config = { url, secret, events };
        try {
            if (editingId) {
                await IntegrationService.update(editingId, { name, config });
            } else {
                await IntegrationService.create({
                    org_id: currentOrg.id,
                    type: "webhook",
                    name,
                    config,
                });
            }
            resetForm();
            fetchWebhooks();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this webhook?")) return;
        try {
            await IntegrationService.delete(id);
            fetchWebhooks();
        } catch (error) {
            console.error(error);
        }
    };

    const handleTest = async (webhookUrl: string, webhookSecret?: string) => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await IntegrationService.testWebhook(webhookUrl, webhookSecret);
            setTestResult({
                success: result.success,
                message: result.message,
            });
        } catch (error) {
            setTestResult({
                success: false,
                message: "Failed to send test request",
            });
        } finally {
            setTesting(false);
        }
    };

    const startEdit = (webhook: Integration) => {
        setEditingId(webhook.id);
        setName(webhook.name);
        setUrl((webhook.config as any).url || "");
        setSecret((webhook.config as any).secret || "");
        setEvents((webhook.config as any).events || []);
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setName("");
        setUrl("");
        setSecret("");
        setEvents(["document.approved"]);
        setTestResult(null);
    };

    const toggleEvent = (eventId: string) => {
        setEvents((prev) =>
            prev.includes(eventId)
                ? prev.filter((e) => e !== eventId)
                : [...prev, eventId]
        );
    };

    if (loading) return <div>Loading webhooks...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Webhooks</h2>
                    <p className="text-sm text-muted-foreground">
                        Receive event notifications at your external URLs.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" /> Add Webhook
                    </button>
                )}
            </div>

            {showForm && (
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                    <h3 className="mb-4 text-base font-semibold">
                        {editingId ? "Edit Webhook" : "New Webhook"}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Production Endpoint"
                                    className="w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Target URL</label>
                                <input
                                    required
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://api.example.com/webhooks"
                                    className="w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Signing Secret (Optional)</label>
                            <input
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                placeholder="secret_key_..."
                                className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Sent as <code>X-Webhook-Secret</code> header for verification.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Trigger Events</label>
                            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                                {availableEvents.map((event) => (
                                    <label
                                        key={event.id}
                                        className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={events.includes(event.id)}
                                            onChange={() => toggleEvent(event.id)}
                                            className="h-4 w-4 rounded border-primary"
                                        />
                                        <span className="text-sm">{event.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="submit"
                                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                {editingId ? "Update Webhook" : "Create Webhook"}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                {webhooks.length === 0 && !showForm ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                        No webhooks configured. Click "Add Webhook" to create one.
                    </div>
                ) : (
                    webhooks.map((webhook) => {
                        const config = webhook.config as any;
                        return (
                            <div
                                key={webhook.id}
                                className="flex items-start justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary/20"
                            >
                                <div className="flex gap-3">
                                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded bg-purple-100 text-purple-600">
                                        <Webhook className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{webhook.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                                {config.url}
                                            </code>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {(config.events || []).map((e: string) => (
                                                <span
                                                    key={e}
                                                    className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                                                >
                                                    {e}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleTest(config.url, config.secret)}
                                        disabled={testing}
                                        className="rounded-md border p-2 hover:bg-muted"
                                        title="Send Test Event"
                                    >
                                        <Play className={cn("h-4 w-4", testing && "animate-pulse")} />
                                    </button>
                                    <button
                                        onClick={() => startEdit(webhook)}
                                        className="rounded-md border p-2 hover:bg-muted"
                                        title="Edit"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="rounded-md border p-2 text-red-500 hover:bg-red-50"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {testResult && (
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-lg border p-4",
                        testResult.success
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-red-200 bg-red-50 text-red-800"
                    )}
                >
                    {testResult.success ? (
                        <CheckCircle2 className="h-5 w-5" />
                    ) : (
                        <AlertCircle className="h-5 w-5" />
                    )}
                    <p className="text-sm font-medium">{testResult.message}</p>
                </div>
            )}
        </div>
    );
}
