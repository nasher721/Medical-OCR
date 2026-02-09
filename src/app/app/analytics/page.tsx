"use client";

import { useEffect, useState } from "react";
import { useOrgStore } from "@/lib/hooks/use-org";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { ThroughputChart } from "@/components/analytics/charts/throughput-chart";
import { PerformanceChart } from "@/components/analytics/charts/performance-chart";
import { Loader2, TrendingUp, Users, Activity, FileCheck } from "lucide-react";

export default function AnalyticsPage() {
  const { currentOrg } = useOrgStore();
  const [throughput, setThroughput] = useState<{ date: string; count: number }[]>([]);
  const [performance, setPerformance] = useState<{ name: string; value: number }[]>([]);
  const [activity, setActivity] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) fetchData();
  }, [currentOrg]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [throughputData, perfData, activityData] = await Promise.all([
        AnalyticsService.getThroughput(currentOrg!.id),
        AnalyticsService.getPerformance(currentOrg!.id),
        AnalyticsService.getActivity(currentOrg!.id),
      ]);
      setThroughput(throughputData || []);
      setPerformance(perfData || []);
      setActivity(activityData || []);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalDocs = throughput.reduce((acc, curr) => acc + curr.count, 0);
  const avgDocsPerDay = Math.round(totalDocs / 30);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Insights into document processing and team performance over the last 30 days.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Processed</h3>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{totalDocs}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Avg Throughput</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{avgDocsPerDay}<span className="text-sm font-normal text-muted-foreground ml-1">/day</span></div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Success Rate</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {/* Mock calculation for demo */}
          <div className="text-3xl font-bold">98.5%</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Active Users</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{activity.length}</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Processing Volume (30 Days)</h3>
          <ThroughputChart data={throughput} />
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Document Status</h3>
          <PerformanceChart data={performance} />
        </div>
      </div>

      {/* Activity Table */}
      <div className="flex-1 rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">Top Contributors</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
              <th className="px-6 py-3 font-medium text-right">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {activity.map((user, i) => {
              const totalActions = activity.reduce((s, u) => s + u.count, 0);
              const share = Math.round((user.count / totalActions) * 100);

              return (
                <tr key={i} className="group hover:bg-muted/50">
                  <td className="px-6 py-3 font-medium">{user.name}</td>
                  <td className="px-6 py-3 text-right">{user.count}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{share}%</td>
                </tr>
              );
            })}
            {activity.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">No activity recorded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
