import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/lib/auth-store";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import VoyagesPage from "@/pages/VoyagesPage";
import ShipsPage from "@/pages/ShipsPage";
import RoutesPage from "@/pages/RoutesPage";
import WidgetConfigsPage from "@/pages/WidgetConfigsPage";
import EmissionsPage from "@/pages/EmissionsPage";
import UsersPage from "@/pages/UsersPage";
import AuditLogsPage from "@/pages/AuditLogsPage";

/**
 * Root App component.
 * If not authenticated → show login.
 * Otherwise → dashboard layout with nested pages.
 */
export default function App() {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="voyages" element={<VoyagesPage />} />
        <Route path="ships" element={<ShipsPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="widgets" element={<WidgetConfigsPage />} />
        <Route path="emissions" element={<EmissionsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="logs" element={<AuditLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
