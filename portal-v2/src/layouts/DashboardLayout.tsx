import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/auth-store";
import {
  LayoutDashboard,
  Ship,
  MapPin,
  Calendar,
  Palette,
  BarChart3,
  Users,
  ScrollText,
  LogOut,
  Anchor,
} from "lucide-react";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/voyages", icon: Calendar, label: "Voyages" },
  { to: "/ships", icon: Ship, label: "Ships" },
  { to: "/routes", icon: MapPin, label: "Routes" },
  { to: "/emissions", icon: BarChart3, label: "Emissions" },
  { to: "/widgets", icon: Palette, label: "Widgets" },
  { to: "/users", icon: Users, label: "Users" },
  { to: "/logs", icon: ScrollText, label: "Audit Logs" },
];

/**
 * Sidebar + top-bar layout wrapping all authenticated pages.
 */
export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex flex-col bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <Anchor className="w-6 h-6 text-teal-400" />
          <span className="text-lg font-bold tracking-tight text-white">
            PaceCtrl
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-500/15 text-teal-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom user section */}
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-1">Signed in as</div>
          <div className="text-sm font-medium text-white truncate">
            {user?.username}
          </div>
          <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
          <button
            onClick={handleLogout}
            className="mt-3 flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
