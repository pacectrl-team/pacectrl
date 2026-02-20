"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import Link from "next/link";
import {
  Waves,
  LayoutDashboard,
  Network,
  Ship,
  MapPin,
  Compass,
  Palette,
  Gauge,
  LogOut,
  ChevronRight,
  ScrollText,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AnimatedWaves from "@/components/AnimatedWaves";
import LoadingScreen from "@/components/LoadingScreen";

type NavEntry =
  | { kind: "link"; href: string; label: string; icon: LucideIcon }
  | { kind: "separator" };

const NAV_ITEMS: NavEntry[] = [
  { kind: "link", href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { kind: "link", href: "/dashboard/operations", label: "Operations", icon: Network },
  { kind: "link", href: "/dashboard/voyages", label: "Voyages", icon: Compass },
  { kind: "link", href: "/dashboard/widgets", label: "Widget Editor", icon: Palette },
  { kind: "separator" },
  { kind: "link", href: "/dashboard/ships", label: "Ships", icon: Ship },
  { kind: "link", href: "/dashboard/routes", label: "Routes", icon: MapPin },
  { kind: "link", href: "/dashboard/emissions", label: "Speed & Emissions", icon: Gauge },
  { kind: "separator" },
  { kind: "link", href: "/dashboard/logs", label: "API Logs", icon: ScrollText },
  { kind: "link", href: "/dashboard/users", label: "Users", icon: Users },
];

/**
 * Dashboard layout with sidebar navigation.
 * Guards all /dashboard/* routes behind authentication.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user, hydrate, isLoading, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/");
    }
  }, [isLoading, token, router]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/");
  }, [logout, router]);

  if (isLoading || !token || !user) {
    return <LoadingScreen message="Loading Dashboard..." />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---- Sidebar ---- */}
      <aside className="w-64 min-w-[256px] bg-slate-900 text-slate-100 flex flex-col relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-10 pointer-events-none">
          <AnimatedWaves className="text-teal-400" />
        </div>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 relative z-10">
          <Waves className="w-7 h-7 text-teal-400" strokeWidth={1.5} />
          <span className="text-lg font-bold tracking-tight">PaceCtrl</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto relative z-10">
          {NAV_ITEMS.map((item, idx) => {
            if (item.kind === "separator") {
              return (
                <div
                  key={`sep-${idx}`}
                  className="my-2 border-t border-slate-800"
                />
              );
            }
            const { href, label, icon: Icon } = item;
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group
                  ${
                    isActive
                      ? "bg-teal-600/20 text-teal-400"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                  }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-teal-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-slate-800 px-4 py-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-sm font-bold text-white uppercase">
              {user.username[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user.username}
              </div>
              <div className="text-xs text-slate-500 capitalize">
                {user.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
    </div>
  );
}
