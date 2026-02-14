"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Brain,
  GitBranch,
  Plug,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/hooks/use-org";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { NotificationProvider } from "@/components/notifications/notification-provider";

const navItems = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Triage", href: "/app/workspace", icon: Layers },
  { label: "Documents", href: "/app/documents", icon: FileText },
  { label: "Models", href: "/app/models", icon: Brain },
  { label: "Workflows", href: "/app/workflows", icon: GitBranch },
  { label: "Integrations", href: "/app/integrations", icon: Plug },
  { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentOrg, loading: orgLoading } = useOrg();
  const { user, profile, loading: userLoading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <NotificationProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.06] bg-card/80 backdrop-blur-xl transition-transform duration-300 ease-out lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Org header */}
          <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-xs font-bold text-white shadow-lg shadow-primary/25">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-semibold text-foreground">
                {orgLoading ? "Loading..." : currentOrg?.name || "Medical OCR"}
              </p>
              <p className="text-[11px] text-muted-foreground">Organization</p>
            </div>
            {/* Mobile close */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Navigation
            </p>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/app/dashboard" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
                          : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground/70 group-hover:text-foreground"
                        )}
                      />
                      {item.label}
                      {item.href === "/app/documents" && <NotificationBadge />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-white/[0.06] p-3">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 hover:bg-accent/80"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-[11px] font-bold text-white shadow-sm">
                    {initials}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {userLoading ? "Loading..." : displayName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user?.email || ""}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    userMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-full animate-slide-up rounded-xl border border-white/[0.08] bg-card/90 p-1.5 shadow-xl backdrop-blur-xl">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar (mobile) */}
          <header className="flex h-14 items-center gap-4 border-b border-white/[0.06] bg-card/50 px-4 backdrop-blur-xl lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold">
                {currentOrg?.name || "Medical OCR"}
              </span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
