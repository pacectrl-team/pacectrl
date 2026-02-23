import { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { User, UserCreate } from "@/lib/types";
import { Plus, Loader2, Pencil, Trash2, X, Check, Users as UsersIcon, Shield, Anchor } from "lucide-react";

export default function UsersPage() {
  const isAdmin = useAuthStore((s) => s.user!.role === "admin");
  const operatorId = useAuthStore((s) => s.user!.operator_id);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      await deleteUser(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
              {isAdmin && <th className="px-4 py-3 w-24"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-400/10 flex items-center justify-center">
                      {u.role === "admin" ? (
                        <Shield className="w-4 h-4 text-violet-400" />
                      ) : (
                        <Anchor className="w-4 h-4 text-sky-400" />
                      )}
                    </div>
                    <span className="text-white font-medium">{u.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      u.role === "admin"
                        ? "bg-violet-400/15 text-violet-400"
                        : "bg-sky-400/15 text-sky-400"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditId(u.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <UserModal operatorId={operatorId} onClose={() => setShowCreate(false)} onSaved={load} />
      )}
      {editId !== null && (
        <UserModal
          operatorId={operatorId}
          existing={users.find((u) => u.id === editId)}
          onClose={() => setEditId(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function UserModal({
  operatorId,
  existing,
  onClose,
  onSaved,
}: {
  operatorId: number;
  existing?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(existing?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "captain">(existing?.role ?? "captain");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (existing) {
        const data: Record<string, string> = { username, role };
        if (password) data.password = password;
        await updateUser(existing.id, data);
      } else {
        await createUser({ username, password, role, operator_id: operatorId });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{existing ? "Edit User" : "Add User"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Password {existing ? "(leave blank to keep)" : ""}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder={existing ? "••••••••" : "Min 8 characters"}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "captain")}
              className="input"
            >
              <option value="admin">Admin</option>
              <option value="captain">Captain</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !username.trim() || (!existing && password.length < 8)}
            className="btn-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {existing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
