"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  currentUser,
  listRoles,
  createRole,
  deleteRole,
  type RoleItem,
} from "@/lib/api";
import { ErrorState, Loading } from "@/components/States";
import { Toast } from "@/components/Toast";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Counter from "@/components/ui/Counter";
import { inputBase } from "@/components/ui/classes";

const FIXED_ROLE_NAMES = new Set([
  "SUPER_ADMIN",
  "PRINCIPAL",
  "DEAN",
  "HOD",
  "DEPARTMENT_ADMIN",
  "FACULTY",
  "STUDENT",
]);

const TARGET_ROLE_OPTIONS = [
  { label: "Everyone / All (L0)", level: 0 },
  { label: "Principal (L1)", level: 1 },
  { label: "Dean (L2)", level: 2 },
  { label: "HOD (L3)", level: 3 },
  { label: "Faculty (L4)", level: 4 },
  { label: "Student (L5)", level: 5 },
];

export default function ManageRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  // Create Custom Role Modal / Form State
  const [name, setName] = useState("");
  const [level, setLevel] = useState("4");
  const [parentRoleId, setParentRoleId] = useState("");
  const [canPostTo, setCanPostTo] = useState<number[]>([4, 5]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listRoles();
      setRoles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load role hierarchy.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await currentUser();
        if (alive && (!u || u.roleLevel !== 0)) {
          router.replace("/");
        } else if (alive) {
          await load();
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Unable to verify admin credentials.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [load, router]);

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createRole({
        name: name.trim(),
        level: Number(level),
        parentRoleId: parentRoleId ? Number(parentRoleId) : undefined,
        canPostTo,
      });
      setToast({ message: `Role "${name.trim()}" created successfully.`, type: "success" });
      setName("");
      setLevel("4");
      setParentRoleId("");
      setCanPostTo([4, 5]);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create role.";
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole(role: RoleItem) {
    if (FIXED_ROLE_NAMES.has(role.name.toUpperCase())) return;
    const confirmed = window.confirm(
      `Delete custom role "${role.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteRole(role.id);
      setRoles((current) => current.filter((item) => item.id !== role.id));
      setToast({ message: `Role "${role.name}" deleted successfully.`, type: "success" });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to delete role.",
        type: "error",
      });
    }
  }

  const toggleTarget = (targetLevel: number) => {
    setCanPostTo((prev) =>
      prev.includes(targetLevel) ? prev.filter((t) => t !== targetLevel) : [...prev, targetLevel]
    );
  };

  const getLevelName = (lvl: number) => {
    const opt = TARGET_ROLE_OPTIONS.find((o) => o.level === lvl);
    return opt ? opt.label : `Level ${lvl}`;
  };

  if (loading) {
    return <Loading label="Loading campus role hierarchy…" />;
  }

  return (
    <div className="mx-auto w-full max-w-[1450px] px-4 py-8 sm:px-8 sm:py-10 lg:px-[clamp(20px,4vw,60px)]">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <header className="mb-7 flex flex-col items-start justify-between gap-6 sm:flex-row">
        <div>
          <span className="text-[11px] font-extrabold text-brand">Governance & Authority</span>
          <h1 className="mt-1.5 text-[32px] leading-tight sm:text-4xl lg:text-[46px]">Manage Roles</h1>
          <p className="mt-2.5 max-w-[650px] text-[13px] leading-relaxed text-muted">
            Configure the organizational role hierarchy, define custom administrative titles, and govern announcement broadcasting permissions across tiers.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="grid min-w-[130px] gap-1 rounded-2xl border border-border bg-surface p-4">
            <strong className="font-display text-2xl">
              <Counter value={roles.length} />
            </strong>
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Active Roles</span>
          </div>
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Role Hierarchy Table */}
        <div className="rounded-[22px] border border-white/10 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 shadow-soft backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Active Hierarchy</h2>
            <span className="text-xs font-bold text-muted">Ranked by Level (Lower = Higher Authority)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-muted">
                  <th className="py-3 px-3">Level</th>
                  <th className="py-3 px-3">Role Name</th>
                  <th className="py-3 px-3">Parent Role</th>
                  <th className="py-3 px-3">Can Post To</th>
                  <th className="py-3 px-3">Scope</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {roles.map((r) => {
                  const parent = roles.find((p) => p.id === r.parentRoleId);
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-surface-2/60">
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center justify-center rounded-lg bg-brand/20 px-2 py-0.5 font-mono text-xs font-bold text-brand-light">
                          L{r.level}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-ink">
                        {r.name}
                        {r.level === 0 && (
                          <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300">
                            SYSTEM
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-muted">
                        {parent ? `${parent.name} (L${parent.level})` : "— (Top level)"}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {r.canPostTo && r.canPostTo.length > 0 ? (
                            r.canPostTo.map((targetLvl) => (
                              <span
                                key={targetLvl}
                                className="rounded bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-teal-300"
                              >
                                {getLevelName(targetLvl)}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">None (Read-only)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-muted">
                        {FIXED_ROLE_NAMES.has(r.name.toUpperCase()) ? "System Built-in" : "Custom Role"}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {FIXED_ROLE_NAMES.has(r.name.toUpperCase()) ? (
                          <span className="text-[10px] font-bold text-muted">Protected</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleDeleteRole(r)}
                            className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-extrabold text-red-300 transition hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Custom Role Card */}
        <div className="rounded-[22px] border border-white/10 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 shadow-soft backdrop-blur-xl">
          <h2 className="text-xl font-extrabold">Create Custom Role</h2>
          <p className="mt-1 text-xs text-muted">
            Add specialized roles (e.g. &quot;Vice Principal&quot;, &quot;Lab Incharge&quot;) and specify broadcast boundaries.
          </p>
          <div className="mt-3">
            <a
              href="/admin/roles/builder"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-light hover:underline"
            >
              Open Advanced RBAC Role & Scope Builder &rarr;
            </a>
          </div>

          <form onSubmit={handleCreateRole} className="mt-4 space-y-4">
            <Field label="Role Name" htmlFor="role-name">
              <input
                id="role-name"
                required
                className={inputBase}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vice Principal, Lab Incharge"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Authority Level" htmlFor="role-level">
                <input
                  id="role-level"
                  required
                  type="number"
                  min="1"
                  max="10"
                  className={inputBase}
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
              </Field>

              <Field label="Parent Role" htmlFor="parent-role">
                <select
                  id="parent-role"
                  className={inputBase}
                  value={parentRoleId}
                  onChange={(e) => setParentRoleId(e.target.value)}
                >
                  <option value="">None (Top level)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (L{r.level})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-muted">Allowed Broadcast Targets (can_post_to)</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-surface-2/50 p-3">
                {TARGET_ROLE_OPTIONS.map((opt) => (
                  <label key={opt.level} className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canPostTo.includes(opt.level)}
                      onChange={() => toggleTarget(opt.level)}
                      className="rounded border-white/20 bg-surface-2 text-brand focus:ring-brand"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button disabled={saving} className="w-full">
              {saving ? "Creating Role…" : "Create Role"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
