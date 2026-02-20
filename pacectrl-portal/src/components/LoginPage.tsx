"use client";

import { useState } from "react";
import { useAuthStore } from "@/utils/auth-store";
import { Waves, Lock, User, Loader2 } from "lucide-react";
import OceanSimulation from "./OceanSimulation";

/**
 * Full-page login screen with a visual gradient background.
 */
export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch {
      // error state is set in the store
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left – branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col items-center justify-center text-white relative overflow-hidden">
        <OceanSimulation className="opacity-90" />
        <div className="z-10 flex flex-col items-center p-12 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
          <Waves className="w-20 h-20 mb-6 text-teal-400" strokeWidth={1.5} />
          <h1 className="text-4xl font-bold mb-3 tracking-tight">PaceCtrl</h1>
          <p className="text-slate-200 text-center max-w-md text-lg leading-relaxed">
            Helping ferry operators offer greener, slower voyages by surfacing
            speed & emissions tradeoffs to passengers.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-teal-400">CO₂</div>
              <div className="text-sm text-slate-300 mt-1">Reduce emissions</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-400">⚡</div>
              <div className="text-sm text-slate-300 mt-1">Speed tradeoffs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-400">🌊</div>
              <div className="text-sm text-slate-300 mt-1">Calmer seas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right – login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Waves className="w-8 h-8 text-teal-600" />
            <span className="text-2xl font-bold text-slate-900">PaceCtrl</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome back
          </h2>
          <p className="text-slate-500 mb-8">
            Sign in to the operator portal
          </p>

          <form onSubmit={handleSubmit} className={`space-y-5 transition-opacity duration-300 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                  placeholder="Enter your username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-teal-600 text-white font-semibold rounded-lg
                         hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
                         disabled:opacity-80 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
