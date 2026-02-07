"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  GitBranch,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { useUser } from "@/lib/hooks/use-user";
import type { Document, DocumentStatus } from "@/lib/supabase/types";

interface KpiData {
  totalDocuments: number;
  pendingReview: number;
  autoApprovedRate: number;
  activeWorkflows: number;
}

const statusColors: Record<DocumentStatus, string> = {
  uploaded: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  needs_review: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  exported: "bg-purple-100 text-purple-700",
};

export default function DashboardPage() {
  const { currentOrg, loading: orgLoading } = useOrg();
  const { profile } = useUser();
  const [kpis, setKpis] = useState<KpiData>({
    totalDocuments: 0,
    pendingReview: 0,
    autoApprovedRate: 0,
    activeWorkflows: 0,
  });
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;

    let cancelled = false;

    async function fetchDashboardData() {
      const supabase = createClient();

      // Fetch total documents
      const { count: totalDocuments } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg!.id);

      // Fetch pending review count
      const { count: pendingReview } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg!.id)
        .eq("status", "needs_review");

      // Fetch approved count for rate calculation
      const { count: approvedCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg!.id)
        .eq("status", "approved");

      // Fetch active workflows
      const { count: activeWorkflows } = await supabase
        .from("workflows")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg!.id)
        .eq("is_active", true);

      // Fetch recent documents (last 5)
      const { data: recent } = await supabase
        .from("documents")
        .select("*")
        .eq("org_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (cancelled) return;

      const total = totalDocuments ?? 0;
      const approved = approvedCount ?? 0;
      const rate = total > 0 ? Math.round((approved / total) * 100) : 0;

      setKpis({
        totalDocuments: total,
        pendingReview: pendingReview ?? 0,
        autoApprovedRate: rate,
        activeWorkflows: activeWorkflows ?? 0,
      });

      setRecentDocs(recent ?? []);
      setLoading(false);
    }

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [currentOrg]);

  const kpiCards = [
    {
      label: "Total Documents",
      value: kpis.totalDocuments,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Pending Review",
      value: kpis.pendingReview,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Auto-Approved Rate",
      value: `${kpis.autoApprovedRate}%`,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Active Workflows",
      value: kpis.activeWorkflows,
      icon: GitBranch,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  if (orgLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border bg-card"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your document processing pipeline.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    card.bg
                  )}
                >
                  <Icon className={cn("h-4 w-4", card.color)} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Documents */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Documents
          </h2>
          <a
            href="/app/documents"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {recentDocs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No documents yet. Upload your first document to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    statusColors[doc.status] || "bg-gray-100 text-gray-700"
                  )}
                >
                  {doc.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
