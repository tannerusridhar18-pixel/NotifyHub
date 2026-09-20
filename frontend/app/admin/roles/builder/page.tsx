"use client";
import { useCallback, useEffect, useState } from "react";
import {
  RBAC_PERMISSIONS,
  createScopedRole,
  editScopedRole,
  listRoles,
  listAdminUsers,
  roleAssignments,
  assignScopedRole,
  revokeRoleAssignment,
  structureDepartments,
  structureSections,
  type RbacPermission,
  type RoleItem,
  type UserListItem,
  type RoleAssignment,
  type StructureDepartment,
  type StructureSection,
} from "@/lib/api";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { inputBase } from "@/components/ui/classes";
import { Toast } from "@/components/Toast";
import { Loading } from "@/components/States";

export default function RbacBuilderPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [departments, setDepartments] = useState<StructureDepartment[]>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);

  // Create role state
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [savingRole, setSavingRole] = useState(false);

  // Assign state
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [scopeType, setScopeType] = useState<"GLOBAL" | "DEPARTMENT" | "SECTION">("GLOBAL");
  const [scopeId, setScopeId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rList, uList, dList, sList] = await Promise.all([
        listRoles(),
        listAdminUsers({ size: 100 }),
        structureDepartments(),
        structureSections(),
      ]);
      setRoles(rList);
      setUsers(uList.content);
      setDepartments(dList);
      setSections(sList);
      if (rList.length > 0 && selectedRoleId === null) {
        setSelectedRoleId(rList[0].id);
      }
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to load roles", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  const loadAssignments = useCallback(async (roleId: number) => {
    try {
      const data = await roleAssignments(roleId);
      setAssignments(data);
    } catch {
      setAssignments([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedRoleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadAssignments(selectedRoleId);
    }
  }, [selectedRoleId, loadAssignments]);

  const togglePermission = (key: RbacPermission) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingRole(true);
    try {
      await createScopedRole({ name: name.trim(), permissions });
      setToast({ message: "Role created successfully. Permission changes evaluate live.", type: "success" });
      setName("");
      setPermissions([]);
      await loadData();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Unable to create role.", type: "error" });
    } finally {
      setSavingRole(false);
    }
  }

  async function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRoleId || !assignUserId) return;
    setAssigning(true);
    try {
      await assignScopedRole(selectedRoleId, {
        userId: Number(assignUserId),
        scopeType,
        scopeId: scopeType === "GLOBAL" ? undefined : Number(scopeId),
      });
      setToast({ message: "Role assigned successfully.", type: "success" });
      setAssignUserId("");
      setScopeId("");
      await loadAssignments(selectedRoleId);
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Unable to assign role.", type: "error" });
    } finally {
      setAssigning(false);
    }
  }

  async function handleRevokeAssignment(assignmentId: number) {
    try {
      await revokeRoleAssignment(assignmentId);
      setToast({ message: "Assignment revoked (soft-deleted).", type: "success" });
      if (selectedRoleId) {
        await loadAssignments(selectedRoleId);
      }
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Unable to revoke assignment.", type: "error" });
    }
  }

  if (loading) {
    return <Loading label="Loading RBAC configuration…" />;
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8 sm:py-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <header className="mb-8">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">SuperAdmin Governance</span>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">RBAC Role Builder & Scope Assigner</h1>
        <p className="mt-2 text-sm text-muted">
          Define custom roles with fine-grained permission sets. Assign users with GLOBAL, DEPARTMENT, or SECTION scopes.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Create Role Form */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <h2 className="text-xl font-bold">1. Create Scoped Role</h2>
          <p className="mt-1 text-xs text-muted">
            Permission edits on custom roles take effect for all current assignees immediately.
          </p>

          <form onSubmit={handleCreateRole} className="mt-5 space-y-4">
            <Field label="Role Name" htmlFor="role-name">
              <input
                id="role-name"
                required
                className={inputBase}
                placeholder="e.g. LAB_COORDINATOR, EXAM_SUPERVISOR"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <div>
              <p className="mb-2 text-xs font-bold text-muted uppercase">Permissions</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {RBAC_PERMISSIONS.map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2/40 p-3 text-xs font-medium cursor-pointer hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(key)}
                      onChange={() => togglePermission(key)}
                      className="rounded border-white/20 bg-surface-2 text-brand focus:ring-brand"
                    />
                    <span>{key.replaceAll("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button disabled={savingRole} className="w-full">
              {savingRole ? "Creating Role…" : "Create Role"}
            </Button>
          </form>
        </div>

        {/* Manage Role Assignments & Scope */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-6">
          <div>
            <h2 className="text-xl font-bold">2. Assign Role & Scopes</h2>
            <p className="mt-1 text-xs text-muted">
              Select an existing role, assign a user, and bind their operational boundary.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase text-muted">Select Target Role</label>
            <select
              className={inputBase}
              value={selectedRoleId ?? ""}
              onChange={(e) => setSelectedRoleId(Number(e.target.value))}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Level {r.level})
                </option>
              ))}
            </select>
          </div>

          {selectedRole && (
            <form onSubmit={handleAssignRole} className="space-y-4 rounded-xl border border-white/10 bg-surface-2/40 p-4">
              <h3 className="text-sm font-bold text-ink">New Assignment for {selectedRole.name}</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="User" htmlFor="assign-user">
                  <select
                    id="assign-user"
                    required
                    className={inputBase}
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                  >
                    <option value="">Select a user…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Scope Type" htmlFor="assign-scope-type">
                  <select
                    id="assign-scope-type"
                    className={inputBase}
                    value={scopeType}
                    onChange={(e) => setScopeType(e.target.value as "GLOBAL" | "DEPARTMENT" | "SECTION")}
                  >
                    <option value="GLOBAL">GLOBAL (Campus-wide)</option>
                    <option value="DEPARTMENT">DEPARTMENT</option>
                    <option value="SECTION">SECTION</option>
                  </select>
                </Field>
              </div>

              {scopeType === "DEPARTMENT" && (
                <Field label="Target Department" htmlFor="dept-scope">
                  <select
                    id="dept-scope"
                    required
                    className={inputBase}
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                  >
                    <option value="">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {scopeType === "SECTION" && (
                <Field label="Target Section" htmlFor="section-scope">
                  <select
                    id="section-scope"
                    required
                    className={inputBase}
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                  >
                    <option value="">Select section…</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Year {s.academicYear})
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Button disabled={assigning} className="w-full">
                {assigning ? "Assigning Role…" : "Assign Role to User"}
              </Button>
            </form>
          )}

          {/* Active Assignees Table */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">Active Assignees ({assignments.length})</h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-surface-2/60 text-[10px] font-bold uppercase text-muted">
                    <th className="py-2.5 px-3">User Email</th>
                    <th className="py-2.5 px-3">Scope</th>
                    <th className="py-2.5 px-3">Scope ID</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-2/40">
                      <td className="py-2.5 px-3 font-semibold text-ink">{a.userEmail}</td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-light">
                          {a.scopeType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted">{a.scopeId ?? "—"}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => void handleRevokeAssignment(a.id)}
                          className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-muted">
                        No active assignees for this role.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
