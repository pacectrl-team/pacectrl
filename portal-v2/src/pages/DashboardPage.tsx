import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/api";
import type { DashboardOverview } from "@/lib/types";
import {
  Calendar,
  MapPin,
  Palette,
  Users,
  Ship,
  Loader2,
} from "lucide-react";

const CARDS = [
  { key: "voyages" as const, label: "Voyages", icon: Calendar, color: "text-violet-400 bg-violet-400/10" },
  { key: "ships" as const, label: "Ships", icon: Ship, color: "text-teal-400 bg-teal-400/10" },
  { key: "routes" as const, label: "Routes", icon: MapPin, color: "text-amber-400 bg-amber-400/10" },
  { key: "widget_configs" as const, label: "Widget Configs", icon: Palette, color: "text-pink-400 bg-pink-400/10" },
  { key: "users" as const, label: "Users", icon: Users, color: "text-sky-400 bg-sky-400/10" },
];

/**
 * Dashboard overview showing aggregate counts.
 */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-slate-400 text-sm mb-8">
        Overview of your operator account.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {CARDS.map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3
                       hover:border-slate-700 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {data?.[key] ?? "–"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
