"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import LoginPage from "@/components/LoginPage";
import LoadingScreen from "@/components/LoadingScreen";

/**
 * Root page – shows login if unauthenticated, otherwise redirects to dashboard.
 */
export default function Home() {
  const { token, user, hydrate, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token && user) {
      router.replace("/dashboard");
    }
  }, [token, user, router]);

  if (isLoading) {
    return <LoadingScreen message="Initializing PaceCtrl..." />;
  }

  if (token && user) return null;

  return <LoginPage />;
}
