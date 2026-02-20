"use client";

import { useEffect, useState, useCallback } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/api";
import type { User, UserCreate, UserUpdate } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Anchor,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";

type FormMode = "idle" | "create" | "edit";

/**
 * User Management page – list, create, update, and delete operator users.
 * Only admins can mutate; captains see the list read-only.
 */
export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [editId, setEditId] = useState<number | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "captain">("captain");
  const [formPassword, setFormPassword] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  /* ── Data loading ───────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await getUsers());
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Form helpers ───────────────────────────────────────────── */

  function resetForm() {
    setFormMode("idle");
    setEditId(null);
    setFormUsername("");
    setFormRole("captain");
    setFormPassword("");
  }

  function startCreate() {
    resetForm();
    setFormMode("create");
  }

  function startEdit(u: User) {
    setFormMode("edit");
    setEditId(u.id);
    setFormUsername(u.username);
    setFormRole(u.role as "admin" | "captain");
    setFormPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (formMode === "create") {
        const payload: UserCreate = {
          username: formUsername,
          role: formRole,
          password: formPassword,
          operator_id: currentUser!.operator_id,
        };
        await createUser(payload);
      } else if (formMode === "edit" && editId !== null) {
        const payload: UserUpdate = { username: formUsername, role: formRole };
        if (formPassword) payload.password = formPassword;
        await updateUser(editId, payload);
      }
      resetForm();
      await load();
    } catch (err) {
      console.error("Failed to save user", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error("Failed to delete user", err);
    } finally {
      setSaving(false);
    }
  }

  /* ── Role badge ─────────────────────────────────────────────── */

  function roleBadge(role: string) {
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
          <Shield className="w-3 h-3" /> Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
        <Anchor className="w-3 h-3" /> Captain
      </span>
    );
  }

  /* ── Loading skeleton ───────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-32" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1">
            Manage operator accounts — {users.length} user
            {users.length !== 1 && "s"}
          </p>
        </div>
        {isAdmin && formMode === "idle" && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg
                       hover:bg-teal-700 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> New User
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {formMode !== "idle" && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-slate-900">
            {formMode === "create" ? "Create New User" : "Edit User"}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={50}
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as "admin" | "captain")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="captain">Captain</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password{formMode === "edit" && " (leave blank to keep)"}
              </label>
              <input
                type="password"
                required={formMode === "create"}
                minLength={8}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={formMode === "edit" ? "••••••••" : ""}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg
                         hover:bg-teal-700 disabled:opacity-60 text-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : formMode === "create" ? "Create User" : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {/* User list */}
      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No users yet</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left px-5 py-3 font-semibold text-slate-600">User</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Role</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Created</th>
                {isAdmin && (
                  <th className="text-right px-5 py-3 font-semibold text-slate-600">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold uppercase">
                        {u.username[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {u.username}
                          {u.id === currentUser?.user_id && (
                            <span className="ml-1.5 text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full">
                              you
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">ID {u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">{roleBadge(u.role)}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === currentUser?.user_id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Confirm Deletion</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete user{" "}
              <span className="font-semibold">{deleteTarget.username}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Deleting…" : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
