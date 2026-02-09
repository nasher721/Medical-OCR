import { SupabaseClient } from '@supabase/supabase-js';

export async function dispatchWebhooks(
    supabase: SupabaseClient,
    orgId: string,
    event: string,
    payload: Record<string, unknown>
): Promise<void> {
    // Fetch active webhooks for this org
    const { data: integrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('org_id', orgId)
        .eq('type', 'webhook');

    if (!integrations || integrations.length === 0) return;

    const relevantWebhooks = integrations.filter(i => {
        const config = i.config as { events?: string[]; url?: string };
        return config.url && config.events && config.events.includes(event);
    });

    if (relevantWebhooks.length === 0) return;

    const timestamp = new Date().toISOString();
    const fullPayload = {
        id: crypto.randomUUID(),
        event,
        timestamp,
        data: payload,
    };

    // Fire and forget (don't await results to block response)
    relevantWebhooks.forEach(async (webhook) => {
        const config = webhook.config as { url: string; secret?: string };
        try {
            const response = await fetch(config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'MedOCR-Webhook/1.0',
                    ...(config.secret ? { 'X-Webhook-Secret': config.secret } : {}),
                },
                body: JSON.stringify(fullPayload),
            });

            // Log receipt (optional, but good for debugging)
            await supabase.from('webhook_receipts').insert({
                org_id: orgId,
                payload: {
                    webhook_id: webhook.id,
                    url: config.url,
                    status: response.status,
                    success: response.ok,
                    event,
                },
            });
        } catch (error) {
            console.error(`Failed to send webhook to ${config.url}`, error);
        }
    });
}
