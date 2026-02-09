export class AnalyticsService {
    static async getThroughput(orgId: string, range: string = '30d') {
        const res = await fetch(`/api/analytics?org_id=${orgId}&type=throughput&range=${range}`);
        if (!res.ok) throw new Error('Failed to fetch throughput');
        const json = await res.json();
        return json.data;
    }

    static async getPerformance(orgId: string) {
        const res = await fetch(`/api/analytics?org_id=${orgId}&type=performance`);
        if (!res.ok) throw new Error('Failed to fetch performance');
        const json = await res.json();
        return json.data;
    }

    static async getActivity(orgId: string) {
        const res = await fetch(`/api/analytics?org_id=${orgId}&type=activity`);
        if (!res.ok) throw new Error('Failed to fetch activity');
        const json = await res.json();
        return json.data;
    }
}
