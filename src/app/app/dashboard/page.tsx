"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  GitBranch,
  ArrowUpRight,
  TrendingUp,
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
  uploaded: "bg-blue-500/15 text-blue-400",
  processing: "bg-amber-500/15 text-amber-400",
  needs_review: "bg-orange-500/15 text-orange-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
  exported: "bg-purple-500/15 text-purple-400",
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

      const { count: totalDocuments } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg!.id);

      const { count: pendingReview } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg!.id)
        .eq("status", "needs_review");

      const { count: approvedCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg!.id)
        .eq("status", "approved");

      const { count: activeWorkflows } = await supabase
        .from("workflows")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg!.id)
        .eq("is_active", true);

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
      gradient: "from-blue-500 to-cyan-500",
      glow: "shadow-blue-500/20",
    },
    {
      label: "Pending Review",
      value: kpis.pendingReview,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      glow: "shadow-amber-500/20",
    },
    {
      label: "Auto-Approved Rate",
      value: `${kpis.autoApprovedRate}%`,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      glow: "shadow-emerald-500/20",
    },
    {
      label: "Active Workflows",
      value: kpis.activeWorkflows,
      icon: GitBranch,
      gradient: "from-purple-500 to-pink-500",
      glow: "shadow-purple-500/20",
    },
  ];

  if (orgLoading || loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-64 shimmer rounded-lg" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 shimmer rounded-2xl border border-white/[0.06]"
            />
          ))}
        </div>
        <div className="h-64 shimmer rounded-2xl border border-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back
          {profile?.display_name ? (
            <span className="gradient-text">{`, ${profile.display_name}`}</span>
          ) : (
            ""
          )}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Here&apos;s an overview of your document processing pipeline.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
                card.glow,
                index === 0 && "animate-slide-up",
                index === 1 && "animate-slide-up-delay-1",
                index === 2 && "animate-slide-up-delay-2",
                index === 3 && "animate-slide-up-delay-3"
              )}
            >
              {/* Gradient orb background */}
              <div className={cn(
                "absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20",
                card.gradient
              )} />

              <div className="relative flex items-center justify-between">
                <p className="text-[13px] font-medium text-muted-foreground">
                  {card.label}
                </p>
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                    card.gradient,
                    card.glow
                  )}
                >
                  <Icon className="h-[18px] w-[18px] text-white" />
                </div>
              </div>
              <p className="relative mt-4 text-3xl font-bold tracking-tight text-foreground">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Documents */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 shadow-sm backdrop-blur-sm animate-slide-up-delay-2">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Recent Documents
            </h2>
          </div>
          <Link
            href="/app/documents"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentDocs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No documents yet
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground/70">
              Upload your first document to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/app/documents/${doc.id}`}
                className="flex items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-accent/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {doc.filename}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
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
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                    statusColors[doc.status] || "bg-gray-500/15 text-gray-400"
                  )}
                >
                  {doc.status.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
