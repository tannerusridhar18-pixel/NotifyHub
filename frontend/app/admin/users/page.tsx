"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  currentUser,
  listRoles,
  listAdminUsers,
  queryUsersByFilters,
  createAdminUser,
  updateAdminUser,
  removeAdminUser,
  adminEnrollments,
  structureDepartments,
  structureSections,
  structureHostels,
  structureBlocks,
  type RoleItem,
  type UserListItem,
  type EnrollmentItem,
  type StructureDepartment,
  type StructureSection,
  type StructureHostel,
  type StructureBlock,
} from "@/lib/api";
import { Empty, ErrorState, Loading } from "@/components/States";
import { Toast } from "@/components/Toast";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Counter from "@/components/ui/Counter";
import { inputBase } from "@/components/ui/classes";

type ScopedFilterKey = "year" | "section" | "hostel" | "block";
type FilterOption = { id: number | string; label: string };
const USER_FILTER_CONFIG: Array<{ key: ScopedFilterKey; label: string; allLabel: string }> = [
  { key: "year", label: "Year", allLabel: "All years" },
  { key: "section", label: "Section", allLabel: "All sections" },
  { key: "hostel", label: "Hostel", allLabel: "All hostels" },
  { key: "block", label: "Block", allLabel: "All blocks" },
];

export default function ManageUsersPage() {
  const [activeTab, setActiveTab] = useState<"users" | "enrollments">("users");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [departments, setDepartments] = useState<StructureDepartment[]>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [hostels, setHostels] = useState<StructureHostel[]>([]);
  const [blocks, setBlocks] = useState<StructureBlock[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scopedFilters, setScopedFilters] = useState<Partial<Record<ScopedFilterKey, string>>>({});
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserDepartmentId, setCurrentUserDepartmentId] = useState<number | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("FACULTY");
  const [createDeptId, setCreateDeptId] = useState("");
  const [createReportsToId, setCreateReportsToId] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit Modal
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editReportsToId, setEditReportsToId] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const isDepartmentAdmin = currentUserRole === "DEPARTMENT_ADMIN";
      const directoryFilters: Record<string, string> = { ...scopedFilters };
      if (searchQuery) directoryFilters.search = searchQuery;
      if (roleFilter) directoryFilters.role = roleFilter;
      if (statusFilter) directoryFilters.status = statusFilter;
      if (isDepartmentAdmin && currentUserDepartmentId != null) {
        directoryFilters.department = String(currentUserDepartmentId);
      } else if (deptFilter) {
        directoryFilters.department = deptFilter;
      }
      const hasDirectoryFilters = Object.values(directoryFilters).some(Boolean);
      const [uList, rList, dList, sList, hList, bList, eList] = await Promise.all([
        hasDirectoryFilters ? queryUsersByFilters(directoryFilters) : listAdminUsers(),
        listRoles(),
        structureDepartments(),
        structureSections(),
        structureHostels(),
        structureBlocks(),
        isDepartmentAdmin ? Promise.resolve([] as EnrollmentItem[]) : adminEnrollments(),
      ]);
      setUsers(uList.content);
      setRoles(rList);
      setDepartments(dList);
      setSections(sList);
      setHostels(hList);
      setBlocks(bList);
      setEnrollments(eList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, deptFilter, searchQuery, statusFilter, scopedFilters, currentUserRole, currentUserDepartmentId]);

  const scopedFilterOptions = (key: ScopedFilterKey): FilterOption[] => {
    switch (key) {
      case "department": return departments.map(x => ({ id: x.id, label: x.name }));
      case "year": return [1, 2, 3, 4, 5, 6].map(x => ({ id: x, label: `Year ${x}` }));
      case "section": return sections.map(x => ({ id: x.id, label: x.name }));
      case "hostel": return hostels.map(x => ({ id: x.id, label: x.name }));
      case "block": return blocks.map(x => ({ id: x.id, label: x.name }));
    }
  };
  const setScopedFilter = (key: ScopedFilterKey, value: string) => setScopedFilters(previous => ({ ...previous, [key]: value }));
  const clearScopedFilters = () => setScopedFilters({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await currentUser();
        if (alive && (!u || ![0, 3].includes(u.roleLevel))) {
          router.replace("/");
        } else if (alive) {
          setCurrentUserRole(u.role);
          setCurrentUserDepartmentId(u.departmentId ?? null);
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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword.trim()) return;
    setCreating(true);
    try {
      const selectedRoleObj = roles.find((r) => r.name.toUpperCase() === createRole.toUpperCase());
      await createAdminUser({
        email: createEmail.trim(),
        password: createPassword.trim(),
        role: createRole,
        roleId: selectedRoleObj ? selectedRoleObj.id : undefined,
        departmentId: createDeptId ? Number(createDeptId) : undefined,
        reportsToId: createReportsToId ? Number(createReportsToId) : undefined,
        status: "ACTIVE",
      });
      setToast({ message: `User ${createEmail} created successfully.`, type: "success" });
      setIsCreateOpen(false);
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("FACULTY");
      setCreateDeptId("");
      setCreateReportsToId("");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user.";
      setToast({ message: msg, type: "error" });
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u: UserListItem) {
    setEditingUser(u);
    setEditRole(u.role);
    setEditDeptId(u.departmentId ? String(u.departmentId) : "");
    setEditReportsToId(u.reportsToId ? String(u.reportsToId) : "");
    setEditActive(u.active);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    try {
      const selectedRoleObj = roles.find((r) => r.name.toUpperCase() === editRole.toUpperCase());
      await updateAdminUser(editingUser.publicId, {
        role: editRole,
        roleId: selectedRoleObj ? selectedRoleObj.id : undefined,
        departmentId: editDeptId ? Number(editDeptId) : undefined,
        reportsToId: editReportsToId ? Number(editReportsToId) : undefined,
        status: editActive ? "ACTIVE" : "INACTIVE",
      });
      setToast({ message: `User ${editingUser.email} updated successfully.`, type: "success" });
      setEditingUser(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update user.";
      setToast({ message: msg, type: "error" });
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleStatus(u: UserListItem) {
    try {
      await updateAdminUser(u.publicId, {
        status: u.active ? "INACTIVE" : "ACTIVE",
      });
      setToast({
        message: `User ${u.email} is now ${!u.active ? "active" : "inactive"}.`,
        type: "success",
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change user status.";
      setToast({ message: msg, type: "error" });
    }
  }

  async function handleDeleteUser(u: UserListItem) {
    if (!window.confirm(`Are you sure you want to delete user ${u.email}? This action cannot be undone.`)) {
      return;
    }
    try {
      await removeAdminUser(u.publicId);
      setUsers((current) => current.filter((item) => item.publicId !== u.publicId));
      await load();
      setToast({ message: `User ${u.email} deleted successfully.`, type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete user.";
      setToast({ message: msg, type: "error" });
    }
  }

  const filteredEnrollments = enrollments.filter((en) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (en.email && en.email.toLowerCase().includes(q)) ||
      (en.userPublicId && en.userPublicId.toLowerCase().includes(q)) ||
      (en.department && en.department.toLowerCase().includes(q)) ||
      (en.role && en.role.toLowerCase().includes(q))
    );
  });

  if (loading && users.length === 0) {
    return <Loading label="Loading campus users and enrollments…" />;
  }

  return (
    <div className="mx-auto w-full max-w-[1450px] px-4 py-8 sm:px-8 sm:py-10 lg:px-[clamp(20px,4vw,60px)]">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <header className="mb-7 flex flex-col items-start justify-between gap-6 sm:flex-row">
        <div>
          <span className="text-xs font-extrabold text-brand">Identity & Directory</span>
          <h1 className="mt-1.5 text-[32px] leading-tight sm:text-4xl lg:text-[46px]">Manage Users</h1>
          <p className="mt-2.5 max-w-[650px] text-[13px] leading-relaxed text-muted">
            Directory of campus accounts across all authority tiers. Provision leadership accounts, assign department affiliations, and audit enrollments.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid min-w-[110px] gap-1 rounded-2xl border border-border bg-surface p-4">
            <strong className="font-display text-2xl">
              <Counter value={users.length} />
            </strong>
            <span className="text-xs font-bold tracking-wide text-muted">Total Accounts</span>
          </div>
          {currentUserRole !== "DEPARTMENT_ADMIN" && (
            <Button onClick={() => setIsCreateOpen(true)}>+ Provision User</Button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveTab("users")}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
            activeTab === "users"
              ? "bg-brand-50 text-brand-light border border-brand/40"
              : "text-muted hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          All Users ({users.length})
        </button>
        {currentUserRole !== "DEPARTMENT_ADMIN" && (
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
            activeTab === "enrollments"
              ? "bg-brand-50 text-brand-light border border-brand/40"
              : "text-muted hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          Student Enrollments ({enrollments.length})
        </button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {activeTab === "users" ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-brand/25 bg-brand-50/30 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-ink">Directory filters</h2>
                <p className="text-xs text-muted">Use the primary filters first; open more filters for academic details.</p>
              </div>
              <button
                type="button"
                onClick={clearScopedFilters}
                disabled={!Object.values(scopedFilters).some(Boolean)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-brand-light transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear all filters
              </button>
            </div>
            <button
              type="button"
              aria-expanded={advancedFiltersOpen}
              aria-controls="advanced-user-filters"
              onClick={() => setAdvancedFiltersOpen((open) => !open)}
              className="mb-3 rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:border-brand-light/50 hover:bg-surface-3"
            >
              {advancedFiltersOpen ? "Hide more filters" : "More filters"}
              <span className="ml-1.5 text-muted">(Year, Section, Hostel, Block)</span>
            </button>
            <div id="advanced-user-filters" hidden={!advancedFiltersOpen} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {USER_FILTER_CONFIG.map((filter) => (
                <div key={filter.key}>
                  <label className="mb-1 block text-xs font-bold text-muted">{filter.label}</label>
                  <select
                    className={inputBase}
                    value={scopedFilters[filter.key] ?? ""}
                    onChange={(event) => setScopedFilter(filter.key, event.target.value)}
                  >
                    <option value="">{filter.allLabel}</option>
                    {scopedFilterOptions(filter.key).map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
          {/* Filter Bar */}
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-surface/90 p-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted">Search Query</label>
              <input
                className={inputBase}
                placeholder="Search email, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted">Role</label>
              <select
                className={inputBase}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} (L{r.level})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted">Department</label>
              <select
                className={inputBase}
                value={currentUserRole === "DEPARTMENT_ADMIN" && currentUserDepartmentId != null ? String(currentUserDepartmentId) : deptFilter}
                disabled={currentUserRole === "DEPARTMENT_ADMIN"}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted">Status</label>
              <select
                className={inputBase}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-[22px] border border-white/10 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 shadow-soft backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-muted">
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Role & Tier</th>
                    <th className="py-3 px-3">Affiliation</th>
                    <th className="py-3 px-3">Reporting Line</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map((u) => {
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-surface-2/60">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-brand/20 font-bold text-brand-light">
                              {(u.email || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-ink truncate">{u.email}</div>
                              <div className="text-[10px] text-muted truncate">{u.publicId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-light">
                            <span>{u.role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
                            <span className="font-mono text-[9px] text-muted">L{u.level}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-muted">
                          {u.department ? (
                            <span className="font-medium text-ink">{u.department}</span>
                          ) : (
                            <span className="text-muted/60">Campus-wide</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-muted">
                          {u.reportsToEmail ? (
                            <span>{u.reportsToEmail}</span>
                          ) : (
                            <span className="text-muted/60">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[9px] font-extrabold ${
                              u.active
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-danger/20 text-[#ff8ba0]"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {currentUserRole === "DEPARTMENT_ADMIN" ? (
                              <span className="text-xs font-bold text-muted">Department user</span>
                            ) : (
                              <>
                                                            <button
                                                              onClick={() => openEdit(u)}
                                                              className="rounded-xl border border-brand/40 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-light transition-colors hover:bg-brand-50/80"
                                                            >
                                                              Edit
                                                            </button>
                                                            <button
                                                              onClick={() => void handleToggleStatus(u)}
                                                              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                                                                u.active
                                                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                                                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                                              }`}
                                                            >
                                                              {u.active ? "Deactivate" : "Activate"}
                                                            </button>
                                                            <button
                                                              onClick={() => void handleDeleteUser(u)}
                                                              className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-bold text-danger-light transition-colors hover:border-danger/60 hover:bg-danger-soft/80"
                                                            >
                                                              Delete
                                                            </button>
                                
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <Empty label={Object.values(scopedFilters).some(Boolean) ? "users matching the active filters" : "matching users"} />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Enrollments Tab */
        <div className="rounded-[22px] border border-white/10 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 shadow-soft backdrop-blur-xl">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl font-extrabold">Student Enrollment Directory</h2>
            <input
              className={`${inputBase} max-w-xs`}
              placeholder="Search email, role, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-muted">
                  <th className="py-3 px-3">User Email</th>
                  <th className="py-3 px-3">Public ID</th>
                  <th className="py-3 px-3">Role & Tier</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Invited At</th>
                  <th className="py-3 px-3">Registered At</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredEnrollments.map((en) => (
                  <tr key={en.invitationId} className="transition-colors hover:bg-surface-2/60">
                    <td className="py-3.5 px-3 font-bold text-ink">
                      {en.email}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-brand-light">
                      {en.userPublicId || "—"}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-light">
                        {en.role} (L{en.level})
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-muted">
                      {en.department || "—"}
                    </td>
                    <td className="py-3.5 px-3 text-muted">
                      {en.invitedAt ? new Date(en.invitedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-muted">
                      {en.registeredAt ? new Date(en.registeredAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                        {en.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEnrollments.length === 0 && <Empty label="enrollment records" />}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[26px] border border-white/15 bg-surface p-7 shadow-lift">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-ink">Provision New User</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <Field label="Email Address" htmlFor="create-email">
                <input
                  id="create-email"
                  type="email"
                  required
                  className={inputBase}
                  placeholder="name@notifyhub.edu"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
              </Field>

              <Field label="Temporary Password" htmlFor="create-pass">
                <input
                  id="create-pass"
                  type="password"
                  required
                  className={inputBase}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Role" htmlFor="create-role">
                  <select
                    id="create-role"
                    className={inputBase}
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} (L{r.level})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Department" htmlFor="create-dept">
                  <select
                    id="create-dept"
                    className={inputBase}
                    value={createDeptId}
                    onChange={(e) => setCreateDeptId(e.target.value)}
                  >
                    <option value="">None (Campus-wide)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Reporting Supervisor" htmlFor="create-reports">
                <select
                  id="create-reports"
                  className={inputBase}
                  value={createReportsToId}
                  onChange={(e) => setCreateReportsToId(e.target.value)}
                >
                  <option value="">None</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button disabled={creating}>
                  {creating ? "Provisioning…" : "Provision Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[26px] border border-white/15 bg-surface p-7 shadow-lift">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-ink">Edit User Profile</h2>
                <p className="text-xs text-muted">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role" htmlFor="edit-role">
                  <select
                    id="edit-role"
                    className={inputBase}
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} (L{r.level})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Department" htmlFor="edit-dept">
                  <select
                    id="edit-dept"
                    className={inputBase}
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                  >
                    <option value="">None (Campus-wide)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Reporting Supervisor" htmlFor="edit-reports">
                <select
                  id="edit-reports"
                  className={inputBase}
                  value={editReportsToId}
                  onChange={(e) => setEditReportsToId(e.target.value)}
                >
                  <option value="">None</option>
                  {users
                    .filter((u) => u.id !== editingUser.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email} ({u.role})
                      </option>
                    ))}
                </select>
              </Field>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface-2/50 p-3">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded border-white/20 bg-surface-2 text-brand focus:ring-brand"
                />
                <label htmlFor="edit-active" className="text-xs font-bold text-ink cursor-pointer">
                  Account Active & Enabled
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button disabled={updating}>
                  {updating ? "Saving Changes…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
