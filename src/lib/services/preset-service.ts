import { FilterPreset } from '@/lib/supabase/types';

export class PresetService {
    static async list(orgId: string): Promise<FilterPreset[]> {
        const response = await fetch(`/api/presets?org_id=${orgId}`);
        if (!response.ok) throw new Error('Failed to fetch presets');
        return (await response.json()).data;
    }

    static async create(orgId: string, name: string, filters: Record<string, unknown>): Promise<FilterPreset> {
        const response = await fetch('/api/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ org_id: orgId, name, filters }),
        });
        if (!response.ok) throw new Error('Failed to create preset');
        return (await response.json()).data;
    }

    static async delete(id: string): Promise<void> {
        const response = await fetch(`/api/presets?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete preset');
    }
}
