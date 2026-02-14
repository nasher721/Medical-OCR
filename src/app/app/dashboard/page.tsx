"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  GitBranch,
  ArrowUpRight,
  TrendingUp,
  Zap,
  Upload,
  Settings,
  BarChart3,
  Activity,
  Sparkles,
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const glowVariants = {
  initial: { opacity: 0.1 },
  hover: {
    opacity: 0.25,
    scale: 1.2,
    transition: { duration: 0.4 },
  },
};

function AnimatedNumber({ 
  value, 
  suffix = "", 
  className 
}: { 
  value: number | string; 
  suffix?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === "number" ? value : parseInt(value) || 0;

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepValue = numericValue / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= steps) {
        setDisplayValue(numericValue);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.round(stepValue * current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [numericValue]);

  return (
    <span className={className}>
      {displayValue}
      {suffix}
    </span>
  );
}

function Sparkline({ 
  data, 
  color = "#6366f1",
  className 
}: { 
  data: number[]; 
  color?: string;
  className?: string;
}) {
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (value / Math.max(...data)) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className={className || "w-full h-8"} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        fill={`url(#gradient-${color})`}
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  );
}

function BentoCard({
  children,
  className,
  gradient,
  glowColor,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  glowColor?: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-card/50 backdrop-blur-xl transition-all duration-500",
        "hover:border-white/[0.12] hover:shadow-2xl",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {gradient && (
        <motion.div
          variants={glowVariants}
          initial="initial"
          whileHover="hover"
          className={cn(
            "absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl",
            gradient
          )}
        />
      )}
      {glowColor && (
        <motion.div
          variants={glowVariants}
          initial="initial"
          whileHover="hover"
          className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl"
          style={{ backgroundColor: glowColor }}
        />
      )}
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
}

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
      data: [12, 19, 15, 25, 32, 28, kpis.totalDocuments],
    },
    {
      label: "Pending Review",
      value: kpis.pendingReview,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      glow: "shadow-amber-500/20",
      data: [5, 3, 8, 6, 4, 7, kpis.pendingReview],
    },
    {
      label: "Auto-Approved Rate",
      value: `${kpis.autoApprovedRate}%`,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      glow: "shadow-emerald-500/20",
      data: [65, 72, 78, 82, 88, 91, kpis.autoApprovedRate],
    },
    {
      label: "Active Workflows",
      value: kpis.activeWorkflows,
      icon: GitBranch,
      gradient: "from-purple-500 to-pink-500",
      glow: "shadow-purple-500/20",
      data: [],
    },
  ];

  const quickActions = [
    {
      label: "Upload Document",
      icon: FileText,
      href: "/app/documents",
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      label: "Review Queue",
      icon: Clock,
      href: "/app/workspace",
      gradient: "from-amber-500 to-red-500",
    },
    {
      label: "Create Workflow",
      icon: GitBranch,
      href: "/app/workflows",
      gradient: "from-cyan-500 to-blue-500",
    },
  ];

  if (orgLoading || loading) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-8 w-64 shimmer rounded-lg"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="h-36 shimmer rounded-2xl border border-white/[0.06]"
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="h-64 shimmer rounded-2xl border border-white/[0.06]"
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back
            {profile?.display_name ? (
              <span className="gradient-text">{`, ${profile.display_name}`}</span>
            ) : (
              ""
            )}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here&apos;s an overview of your document processing pipeline.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          System operational
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <BentoCard
              key={card.label}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 p-6 backdrop-blur-sm",
                "hover:border-white/[0.12] hover:bg-card/80 transition-all duration-300",
                "hover:-translate-y-1 hover:shadow-2xl",
                card.glow
              )}
              glowColor={card.gradient.includes("blue") ? "rgba(59, 130, 246, 0.15)" : 
                         card.gradient.includes("amber") ? "rgba(245, 158, 11, 0.15)" :
                         card.gradient.includes("emerald") ? "rgba(16, 185, 129, 0.15)" :
                         "rgba(168, 85, 247, 0.15)"}
            >
              <motion.div variants={itemVariants} className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg cursor-pointer",
                      card.gradient
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </motion.div>
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    +12%
                  </div>
                </div>

                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {card.label}
                </p>

                <div className="flex items-end justify-between">
                  <AnimatedNumber
                    value={typeof card.value === "string" ? parseInt(card.value) : card.value}
                    className="text-3xl font-bold tracking-tight text-foreground"
                    suffix={typeof card.value === "string" ? "%" : ""}
                  />
                  
                  {card.data.length > 0 && (
                    <Sparkline
                      data={card.data}
                      className="h-10 w-20"
                      color={card.gradient.includes("blue") ? "#3b82f6" : 
                                   card.gradient.includes("amber") ? "#f59e0b" :
                                   "#10b981"}
                    />
                  )}
                </div>
              </motion.div>

              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                "bg-gradient-to-br",
                card.gradient,
                "opacity-5"
              )} />
            </BentoCard>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Recent Documents
              </h2>
            </div>
            <Link
              href="/app/documents"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              View all
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {recentDocs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50"
              >
                <FileText className="h-7 w-7 text-muted-foreground/50" />
              </motion.div>
              <p className="text-sm font-medium text-muted-foreground">
                No documents yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Upload your first document to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {recentDocs.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/app/documents/${doc.id}`}
                    className="flex items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-accent/50 group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: -3 }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"
                    >
                      <FileText className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
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
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                        statusColors[doc.status] || "bg-gray-500/15 text-gray-400"
                      )}
                    >
                      {doc.status.replace("_", " ")}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-6"
        >
          <h2 className="text-base font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {quickActions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Link
                    href={action.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-3 transition-all duration-200",
                      "hover:bg-white/[0.05] group cursor-pointer"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br",
                      action.gradient,
                      "group-hover:scale-110 transition-transform duration-200"
                    )}>
                      <ActionIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {action.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">This month</span>
              <span className="font-medium text-foreground">+23% efficiency</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "73%" }}
                transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
