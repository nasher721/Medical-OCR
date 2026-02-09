import { AuditLog } from '@/lib/supabase/types';

export interface GetAuditLogsParams {
    org_id: string;
    page?: number;
    limit?: number;
}

export interface GetAuditLogsResponse {
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
}

export class AuditService {
    static async getLogs(params: GetAuditLogsParams): Promise<GetAuditLogsResponse> {
        const searchParams = new URLSearchParams();
        searchParams.set('org_id', params.org_id);
        if (params.page) searchParams.set('page', params.page.toString());
        if (params.limit) searchParams.set('limit', params.limit.toString());

        const response = await fetch(`/api/audit-logs?${searchParams.toString()}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch audit logs');
        }

        return response.json();
    }
}
