import { useState } from "react";
import { login } from "@/lib/api";
import { Anchor, Loader2 } from "lucide-react";

/**
 * Full-screen login page with a centered card.
 */
export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      // auth store is already updated by login(); React will re-render App
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl"
      >
        {/* Brand */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <Anchor className="w-7 h-7 text-teal-400" />
          <span className="text-xl font-bold text-white tracking-tight">
            PaceCtrl
          </span>
        </div>

        <h1 className="text-lg font-semibold text-white text-center mb-6">
          Operator Portal
        </h1>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-center">
            {error}
          </div>
        )}

        <label className="block text-xs font-medium text-slate-400 mb-1">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full mb-4 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white
                     focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition"
        />

        <label className="block text-xs font-medium text-slate-400 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-6 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white
                     focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500
                     disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
