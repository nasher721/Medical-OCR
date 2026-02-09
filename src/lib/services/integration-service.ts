import { Integration } from '@/lib/supabase/types';

export class IntegrationService {
    static async list(orgId: string): Promise<Integration[]> {
        const response = await fetch(`/api/integrations?org_id=${orgId}`);
        if (!response.ok) throw new Error('Failed to fetch integrations');
        const json = await response.json();
        return json.data;
    }

    static async create(integration: Partial<Integration>): Promise<Integration> {
        const response = await fetch('/api/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(integration),
        });
        if (!response.ok) throw new Error('Failed to create integration');
        const json = await response.json();
        return json.data;
    }

    static async update(id: string, integration: Partial<Integration>): Promise<Integration> {
        const response = await fetch('/api/integrations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...integration }),
        });
        if (!response.ok) throw new Error('Failed to update integration');
        const json = await response.json();
        return json.data;
    }

    static async delete(id: string): Promise<void> {
        const response = await fetch(`/api/integrations?id=${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete integration');
    }

    static async testWebhook(url: string, secret?: string): Promise<{ success: boolean; status: number; message: string }> {
        const response = await fetch('/api/integrations/test-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, secret }),
        });
        return response.json();
    }
}
