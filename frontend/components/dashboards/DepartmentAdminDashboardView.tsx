"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  scopedQueries,
  queryUsersByFilters,
  removeAdminUser,
  answerScopedQuery,
  departmentFacultyList,
  departmentStudentList,
  departmentAnalytics,
  updateDepartmentStudent,
  deactivateDepartmentStudent,
  createInvitation,
  batchPromoteStudents,
  assignDepartmentHod,
  structureDepartments,
  structureBranches,
  structureSections,
  logout,
  type CurrentUser,
  type DepartmentFacultyItem,
  type StructureDepartment,
  type StructureBranch,
  type StructureSection,
} from "@/lib/api";
import type { CampusQuery, BatchPromoteResult, DepartmentAnalytics, DepartmentStudentItem } from "@/types";
import { Empty, ErrorState, Loading } from "@/components/States";
import { StatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";
import { inputBase, textareaBase } from "@/components/ui/classes";

export default function DepartmentAdminDashboardView({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<"inbox" | "faculty" | "students" | "promotion" | "hod">("inbox");
  const [queries, setQueries] = useState<CampusQuery[]>([]);
  const [facultyList, setFacultyList] = useState<DepartmentFacultyItem[]>([]);
  const [studentList, setStudentList] = useState<DepartmentStudentItem[]>([]);
  const [analytics, setAnalytics] = useState<DepartmentAnalytics | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentYearFilter, setStudentYearFilter] = useState("");
  const [studentSectionFilter, setStudentSectionFilter] = useState("");
  const [studentHostelFilter, setStudentHostelFilter] = useState("");
  const [studentBlockFilter, setStudentBlockFilter] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("");
  const [editingStudent, setEditingStudent] = useState<DepartmentStudentItem | null>(null);
  const [branches, setBranches] = useState<StructureBranch[]>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [showStudentInvite, setShowStudentInvite] = useState(false);
  const [studentInvite, setStudentInvite] = useState({ email: "", name: "", studentId: "", branchId: "", sectionId: "", year: "1", semester: "1" });
  const [bulkStudents, setBulkStudents] = useState("");
  const [studentInviteMsg, setStudentInviteMsg] = useState("");
  const [studentInviteBusy, setStudentInviteBusy] = useState(false);
  const [allDepts, setAllDepts] = useState<StructureDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inquiries Desk state
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  // Faculty Invite Modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteDesignation, setInviteDesignation] = useState("Assistant Professor");
  const [inviteFacultyId, setInviteFacultyId] = useState("");
  const [selectedSubDeptIds, setSelectedSubDeptIds] = useState<number[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  // Batch Promotion state
  const [fromYear, setFromYear] = useState(1);
  const [toYear, setToYear] = useState(2);
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [promoteResult, setPromoteResult] = useState<BatchPromoteResult | null>(null);

  // HOD Assignment state
  const [selectedHodUserId, setSelectedHodUserId] = useState<string>("");
  const [hodBusy, setHodBusy] = useState(false);
  const [hodMsg, setHodMsg] = useState("");

  const deptId = user.departmentId || user.student?.departmentId || user.faculty?.departmentId || 1;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [q, f, s, d, b, sectionData, overview] = await Promise.all([
        scopedQueries(),
        departmentFacultyList(deptId).catch(() => []),
        departmentStudentList(deptId).catch(() => []),
        structureDepartments().catch(() => []),
        structureBranches().catch(() => []),
        structureSections().catch(() => []),
        departmentAnalytics(deptId).catch(() => null),
      ]);
      setQueries(q.content || []);
      setFacultyList(f || []);
      setStudentList(s || []);
      setAllDepts(d || []);
      setBranches(b || []);
      setSections(sectionData || []);
      setAnalytics(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Department Admin workspace.");
    } finally {
      setLoading(false);
    }
  }, [deptId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void loadData();
  }, [loadData]);

  async function handleAnswerQuery(id: number) {
    if (!replyText.trim()) return;
    setReplyBusy(true);
    try {
      await answerScopedQuery(id, replyText);
      setReplyingId(null);
      setReplyText("");
      const q = await scopedQueries();
      setQueries(q.content || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to answer query.");
    } finally {
      setReplyBusy(false);
    }
  }

  async function handleInviteFaculty(e: React.FormEvent) {
    e.preventDefault();
    setInviteBusy(true);
    setInviteMsg("");
    try {
      await createInvitation({
        email: inviteEmail,
        role: "FACULTY",
        departmentId: deptId,
        homeDepartmentId: deptId,
        subDepartmentIds: selectedSubDeptIds,
        profile: {
          name: inviteName,
          facultyId: inviteFacultyId || undefined,
          designation: inviteDesignation,
          departmentId: deptId,
        },
      });
      setInviteMsg("✓ Faculty invitation link generated & dispatched!");
      setInviteEmail("");
      setInviteName("");
      setInviteFacultyId("");
      setSelectedSubDeptIds([]);
      await loadData();
    } catch (err) {
      setInviteMsg(`⚠ ${err instanceof Error ? err.message : "Failed to invite faculty."}`);
    } finally {
      setInviteBusy(false);
    }
  }

  async function saveStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateDepartmentStudent(deptId, editingStudent.id, {
        name: editingStudent.name,
        year: editingStudent.year,
        semester: editingStudent.semester,
      });
      setEditingStudent(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update student.");
    }
  }

  async function deleteStudent(student: DepartmentStudentItem) {
    if (!confirm(`Permanently delete ${student.name}? This cannot be undone.`)) return;
    try {
      const users = await queryUsersByFilters({ search: student.email, department: String(deptId) });
      const target = users.content?.find((u) => u.email?.toLowerCase() === student.email?.toLowerCase());
      if (!target?.publicId) throw new Error("Could not resolve the student's account for deletion.");
      await removeAdminUser(target.publicId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete student.");
    }
  }

  async function deactivateStudent(student: DepartmentStudentItem) {
    if (!confirm(`Deactivate ${student.name}?`)) return;
    try {
      await deactivateDepartmentStudent(deptId, student.id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate student.");
    }
  }

  async function inviteStudents(e: React.FormEvent) {
    e.preventDefault();
    setStudentInviteBusy(true);
    setStudentInviteMsg("");
    try {
      if (bulkStudents.length > 1_000_000) throw new Error("Bulk CSV is limited to 1 MB.");
      const rows = bulkStudents.trim()
        ? bulkStudents.trim().split(/\r?\n/).map((line) => line.split(",").map((value) => value.trim()))
        : [[studentInvite.email, studentInvite.name, studentInvite.studentId, studentInvite.branchId, studentInvite.sectionId, studentInvite.year, studentInvite.semester]];
      if (rows.length > 100) throw new Error("Bulk CSV is limited to 100 rows.");
      if (rows.some((row) => row.length !== 7)) throw new Error("Each CSV row must contain exactly 7 fields; department is locked to your department.");
      if (rows.some((row) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[0]))) throw new Error("Every student email must be valid.");
      const sanitize = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value;
      for (const row of rows) {
        await createInvitation({ email: row[0], role: "STUDENT", departmentId: deptId, branchId: Number(row[3]), sectionId: Number(row[4]), profile: { name: sanitize(row[1]), studentId: sanitize(row[2]), departmentId: deptId, branchId: Number(row[3]), sectionId: Number(row[4]), year: Number(row[5]), semester: Number(row[6]) } });
      }
      setStudentInviteMsg(`Created ${rows.length} student invitation${rows.length === 1 ? "" : "s"}.`);
      setBulkStudents("");
      setStudentInvite({ email: "", name: "", studentId: "", branchId: "", sectionId: "", year: "1", semester: "1" });
      await loadData();
    } catch (err) {
      setStudentInviteMsg(err instanceof Error ? err.message : "Student invitation failed.");
    } finally {
      setStudentInviteBusy(false);
    }
  }

  async function handleBatchPromote() {
    if (!confirm(`Are you sure you want to promote Year ${fromYear} students to Year ${toYear}? This is a transactional operation.`)) {
      return;
    }
    setPromoteBusy(true);
    setPromoteResult(null);
    try {
      const res = await batchPromoteStudents(deptId, fromYear, toYear);
      setPromoteResult(res);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Batch promotion encountered an error.");
    } finally {
      setPromoteBusy(false);
    }
  }

  async function handleAssignHod(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHodUserId) return;
    setHodBusy(true);
    setHodMsg("");
    try {
      const res = await assignDepartmentHod(deptId, Number(selectedHodUserId));
      setHodMsg(`✓ ${res.message || "HOD role successfully assigned."}`);
      await loadData();
    } catch (err) {
      setHodMsg(`⚠ ${err instanceof Error ? err.message : "Failed to assign HOD."}`);
    } finally {
      setHodBusy(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  if (loading) {
    return <Loading label="Loading Department Governance Desk…" />;
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 flex min-h-[74px] flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-bg/85 px-4 py-3 backdrop-blur-2xl sm:px-8">
        <Link href="/" className="group flex items-center gap-3 font-display text-lg font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white shadow-glow transition-all duration-300 group-hover:scale-110">
            ◈
          </span>
          <span className="tracking-tight text-xl font-extrabold">
            Notify<span className="text-brand-light">Hub</span>
          </span>
        </Link>
        <div className="hidden items-center gap-2 text-xs font-semibold text-muted md:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-2/40 bg-brand-50 px-3 py-0.5 text-[10px] font-extrabold uppercase text-brand-2-light shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            DEPARTMENT ADMIN
          </span>
          <span>{user.department ? `${user.department} Department` : "Scoped Governance"}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard/my-posts" className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all">My Posts</Link>
          <Link
            href="/admin/events"
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            Events Manager
          </Link>
          <Link
            href="/admin/announcements"
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            Announcements
          </Link>
          <button
            onClick={() => void handleSignOut()}
            className="rounded-xl border border-white/10 bg-surface-2/60 px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-[1300px] px-4 py-8 sm:px-8">
        {/* Banner Section */}
        <section className="mb-8 rounded-3xl border border-white/12 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 shadow-lift backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-2/30 bg-brand-50 px-3 py-1 text-[10px] font-extrabold tracking-widest text-brand-2-light uppercase">
                Department Scoped Governance
              </span>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                {user.department ? `${user.department} Administration` : "Department Operations"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                Student & Faculty inquiry desk, faculty appointments, batch promotions, and HOD assignment.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Open Queries</span>
                <span className="text-2xl font-extrabold text-amber-400">
                  {queries.filter((q) => q.status === "OPEN").length}
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Faculty Staff</span>
                <span className="text-2xl font-extrabold text-brand-light">{facultyList.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Students</span><span className="text-2xl font-extrabold text-teal-light">{analytics?.totalStudents ?? studentList.length}</span></div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Sections</span><span className="text-2xl font-extrabold text-cyan">{analytics?.totalSections ?? "—"}</span></div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-t border-white/[0.08] pt-6 overflow-x-auto">
            <button
              onClick={() => setTab("inbox")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "inbox"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📥 Dual Inquiries Desk ({queries.filter((q) => q.status === "OPEN").length} Open)
            </button>
            <button
              onClick={() => setTab("faculty")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "faculty"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              👨‍🏫 Faculty Mappings & Inviter ({facultyList.length})
            </button>
            <button
              onClick={() => setTab("students")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${tab === "students" ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow" : "bg-surface-2/60 text-muted hover:text-white"}`}
            >
              🎓 Student Management ({studentList.length})
            </button>
            <button
              onClick={() => setTab("promotion")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "promotion"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              ⚡ Batch Student Year-Promotion
            </button>
            <button
              onClick={() => setTab("hod")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "hod"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              👑 HOD Leadership Assignment
            </button>
          </div>
        </section>

        {error && <ErrorState message={error} onRetry={() => void loadData()} />}

        {!error && tab === "inbox" && (
          <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Department Inquiries Desk</h2>
                <p className="text-xs text-muted">Manage queries received from students and faculty members.</p>
              </div>
            </div>

            {queries.length === 0 ? (
              <Empty label="No queries currently assigned to this department desk." />
            ) : (
              <div className="space-y-4">
                {queries.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-white/10 bg-surface-2/80 p-5 transition-all hover:border-white/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">{q.subject || "Campus Inquiry"}</span>
                          {q.askerType && (
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[9px] font-extrabold text-brand-light">
                              {q.askerType} ASKER
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">
                          Sender: <strong className="text-ink">{q.name || q.email}</strong> · {new Date(q.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>

                    <div className="my-3 rounded-xl border border-white/[0.06] bg-surface/60 p-4 text-xs leading-relaxed text-ink">
                      {q.message || q.question}
                    </div>

                    {q.adminResponse ? (
                      <div className="rounded-xl border border-teal-500/30 bg-teal-soft/60 p-3.5 text-xs">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-teal-light">
                          Resolution Answer:
                        </span>
                        <p className="mt-1 text-ink">{q.adminResponse}</p>
                      </div>
                    ) : (
                      <div>
                        {replyingId === q.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea
                              rows={3}
                              placeholder="Write the department's resolution or response…"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className={textareaBase}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                disabled={replyBusy}
                                onClick={() => void handleAnswerQuery(q.id)}
                              >
                                {replyBusy ? "Submitting…" : "Confirm Resolution"}
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setReplyingId(null);
                                  setReplyText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            className="!px-4 !py-1.5 !text-xs"
                            onClick={() => {
                              setReplyingId(q.id);
                              setReplyText("");
                            }}
                          >
                            ✍ Respond / Resolve Inquiry
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!error && tab === "faculty" && (
          <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Faculty Department Mappings</h2>
                <p className="text-xs text-muted">
                  Faculty members assigned with HOME (Primary) or SUB (Cross-Department) appointments.
                </p>
              </div>
              <Button variant="primary" onClick={() => setShowInviteModal(true)}>
                + Invite New Faculty Member
              </Button>
            </div>

            {facultyList.length === 0 ? (
              <Empty label="faculty mappings" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Staff ID</th>
                      <th className="py-3 px-4">Faculty Name</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Appointment Type</th>
                      <th className="py-3 px-4">Department Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {facultyList.map((f) => (
                      <tr key={f.id} className="hover:bg-surface-2/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">{f.facultyId}</td>
                        <td className="py-3 px-4 font-bold text-ink">{f.name}</td>
                        <td className="py-3 px-4 text-muted">{f.designation}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                              f.relationship === "HOME"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-brand-50 text-brand-light border border-brand/20"
                            }`}
                          >
                            {f.relationship === "HOME" ? "★ HOME DEPT" : `${f.relationship} DEPT`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted">{f.departmentName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Invite Faculty Modal with HOME & SUB support */}
            {showInviteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-lg font-extrabold text-white">Invite Faculty with Department Scope</h3>
                    <button onClick={() => setShowInviteModal(false)} className="text-muted hover:text-white">✕</button>
                  </div>

                  <form onSubmit={handleInviteFaculty} className="mt-4 space-y-4">
                    <Field label="Faculty Email Address">
                      <input
                        type="email"
                        placeholder="professor@university.edu"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className={inputBase}
                        required
                      />
                    </Field>

                    <Field label="Full Name">
                      <input
                        type="text"
                        placeholder="Dr. Jane Smith"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className={inputBase}
                        required
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Staff / Faculty ID">
                        <input
                          type="text"
                          placeholder="FAC-9012"
                          value={inviteFacultyId}
                          onChange={(e) => setInviteFacultyId(e.target.value)}
                          className={inputBase}
                        />
                      </Field>
                      <Field label="Designation">
                        <input
                          type="text"
                          placeholder="Associate Professor"
                          value={inviteDesignation}
                          onChange={(e) => setInviteDesignation(e.target.value)}
                          className={inputBase}
                          required
                        />
                      </Field>
                    </div>

                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                      ★ <strong>HOME Department:</strong> {user.department || "Current Department"} (Fixed Invariant: exactly 1 HOME dept)
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                        Secondary (SUB) Departments (Optional Cross-Assignments)
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl border border-white/10 bg-surface-2/60">
                        {allDepts
                          .filter((d) => d.id !== deptId)
                          .map((d) => (
                            <label key={d.id} className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-white">
                              <input
                                type="checkbox"
                                checked={selectedSubDeptIds.includes(d.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedSubDeptIds([...selectedSubDeptIds, d.id]);
                                  else setSelectedSubDeptIds(selectedSubDeptIds.filter((id) => id !== d.id));
                                }}
                                className="rounded border-white/20 bg-surface text-brand"
                              />
                              <span className="truncate">{d.name}</span>
                            </label>
                          ))}
                      </div>
                    </div>

                    {inviteMsg && (
                      <p className="rounded-xl border border-white/10 bg-surface-2 p-3 text-xs font-bold">
                        {inviteMsg}
                      </p>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" disabled={inviteBusy}>
                        {inviteBusy ? "Generating Invitation…" : "Send Faculty Invitation"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {!error && tab === "students" && (
          <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div><h2 className="text-2xl font-extrabold text-white">Student Management</h2><p className="text-xs text-muted">Students in {user.department || "your department"}.</p></div>
              <Button variant="primary" onClick={() => setShowStudentInvite(true)}>Invite Students</Button>
            </div>
            <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-surface-2/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <input aria-label="Search students" className={inputBase} placeholder="Search name, ID, email" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
              <select className={inputBase} value={studentYearFilter} onChange={(e) => setStudentYearFilter(e.target.value)}><option value="">All years</option>{[1,2,3,4,5].map((y) => <option key={y} value={y}>{y === 5 ? "Graduated / Alumni" : `Year ${y}`}</option>)}</select>
              <select className={inputBase} value={studentSectionFilter} onChange={(e) => setStudentSectionFilter(e.target.value)}><option value="">All sections</option>{sections.filter((s) => s.departmentId === deptId && s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <select className={inputBase} value={studentHostelFilter} onChange={(e) => setStudentHostelFilter(e.target.value)}><option value="">All hostels</option><option value="HOSTELLER">Hostellers</option><option value="NON_HOSTELLER">Non-hostellers</option></select>
              <select className={inputBase} value={studentStatusFilter} onChange={(e) => setStudentStatusFilter(e.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs"><thead className="border-b border-white/10 text-muted uppercase tracking-wider"><tr><th className="py-3 px-4">Student ID</th><th className="py-3 px-4">Name</th><th className="py-3 px-4">Email</th><th className="py-3 px-4">Year</th><th className="py-3 px-4 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-white/[0.06]">{studentList.filter((student) => `${student.studentId} ${student.name} ${student.email}`.toLowerCase().includes(studentSearch.toLowerCase()) && (!studentYearFilter || String(student.year) === studentYearFilter) && (!studentSectionFilter || String(student.sectionId) === studentSectionFilter) && (!studentHostelFilter || (studentHostelFilter === "HOSTELLER" ? student.hosteller : !student.hosteller)) && (!studentStatusFilter || student.status === studentStatusFilter)).map((student) => <tr key={student.id}><td className="py-3 px-4 font-mono font-bold">{student.studentId}</td><td className="py-3 px-4 font-bold">{student.name}</td><td className="py-3 px-4 text-muted">{student.email}</td><td className="py-3 px-4">{student.year}</td><td className="py-3 px-4 text-right"><button className="mr-2 rounded-lg border border-white/10 px-2 py-1 font-bold text-muted" onClick={() => setEditingStudent({ ...student })}>Edit</button><button className="rounded-lg border border-red-400/30 px-2 py-1 font-bold text-red-200" onClick={() => void deactivateStudent(student)}>Deactivate</button><button className="rounded-lg border border-danger/40 bg-danger-soft px-2 py-1 font-bold text-danger-light" onClick={() => void deleteStudent(student)}>Delete</button></td></tr>)}</tbody>
              </table>
            </div>
            {editingStudent && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><form onSubmit={saveStudent} className="w-full max-w-md space-y-4 rounded-2xl border border-white/15 bg-surface p-6"><h3 className="text-lg font-extrabold">Edit Student</h3><Field label="Name"><input className={inputBase} value={editingStudent.name} onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Year"><input type="number" min={1} className={inputBase} value={editingStudent.year} onChange={(e) => setEditingStudent({ ...editingStudent, year: Number(e.target.value) })} /></Field><Field label="Semester"><input type="number" min={1} className={inputBase} value={editingStudent.semester} onChange={(e) => setEditingStudent({ ...editingStudent, semester: Number(e.target.value) })} /></Field></div><div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setEditingStudent(null)}>Cancel</Button><Button variant="primary" type="submit">Save changes</Button></div></form></div>}
            {showStudentInvite && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><form onSubmit={inviteStudents} className="w-full max-w-lg space-y-4 rounded-2xl border border-white/15 bg-surface p-6"><h3 className="text-lg font-extrabold">Invite Students</h3><p className="text-xs text-muted">Department locked to {user.department || "your department"}. Bulk rows: email,name,studentId,branchId,sectionId,year,semester.</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Email"><input required={!bulkStudents} type="email" className={inputBase} value={studentInvite.email} onChange={(e) => setStudentInvite({ ...studentInvite, email: e.target.value })} /></Field><Field label="Name"><input required={!bulkStudents} className={inputBase} value={studentInvite.name} onChange={(e) => setStudentInvite({ ...studentInvite, name: e.target.value })} /></Field><Field label="Student ID"><input required={!bulkStudents} className={inputBase} value={studentInvite.studentId} onChange={(e) => setStudentInvite({ ...studentInvite, studentId: e.target.value })} /></Field><Field label="Branch"><select required={!bulkStudents} className={inputBase} value={studentInvite.branchId} onChange={(e) => setStudentInvite({ ...studentInvite, branchId: e.target.value, sectionId: "" })}><option value="">Choose branch</option>{branches.filter((branch) => branch.departmentId === deptId && branch.active).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field><Field label="Section"><select required={!bulkStudents} className={inputBase} value={studentInvite.sectionId} onChange={(e) => setStudentInvite({ ...studentInvite, sectionId: e.target.value })}><option value="">Choose section</option>{sections.filter((section) => section.departmentId === deptId && String(section.branchId) === studentInvite.branchId && section.active).map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></Field><Field label="Year"><input required={!bulkStudents} type="number" min={1} className={inputBase} value={studentInvite.year} onChange={(e) => setStudentInvite({ ...studentInvite, year: e.target.value })} /></Field><Field label="Semester"><input required={!bulkStudents} type="number" min={1} className={inputBase} value={studentInvite.semester} onChange={(e) => setStudentInvite({ ...studentInvite, semester: e.target.value })} /></Field></div><Field label="Bulk CSV rows"><textarea className={textareaBase} rows={4} value={bulkStudents} onChange={(e) => setBulkStudents(e.target.value)} placeholder="email,name,studentId,branchId,sectionId,year,semester" /></Field>{studentInviteMsg && <p className="rounded-xl border border-white/10 p-3 text-xs">{studentInviteMsg}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setShowStudentInvite(false)}>Close</Button><Button variant="primary" type="submit" disabled={studentInviteBusy}>{studentInviteBusy ? "Inviting…" : "Create invitations"}</Button></div></form></div>}
          </div>
        )}

        {!error && tab === "promotion" && (
          <div className="max-w-2xl mx-auto">
            <Spotlight tone="brand" className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-light/30 bg-teal-soft px-3 py-1 text-[10px] font-extrabold uppercase text-teal-light">
                Transactional Cohort Promotion
              </span>
              <h2 className="mt-3 text-2xl font-extrabold text-white">Batch Student Year-Promotion</h2>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Seamlessly advance entire student cohorts to the next academic year. NotifyHub validates branch maximum years, transitions final years to Graduated status, and keeps section mappings consistent.
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="From Current Academic Year">
                    <select
                      value={fromYear}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFromYear(val);
                        setToYear(val + 1);
                      }}
                      className={inputBase}
                    >
                      <option value={1}>Year 1 (Freshman)</option>
                      <option value={2}>Year 2 (Sophomore)</option>
                      <option value={3}>Year 3 (Junior)</option>
                      <option value={4}>Year 4 (Senior)</option>
                    </select>
                  </Field>

                  <Field label="To Target Academic Year">
                    <select
                      value={toYear}
                      onChange={(e) => setToYear(Number(e.target.value))}
                      className={inputBase}
                    >
                      <option value={fromYear + 1}>Year {fromYear + 1} (Next Academic Year)</option>
                      {fromYear >= 4 && <option value={5}>Year 5 / Graduated Alumni</option>}
                    </select>
                  </Field>
                </div>

                <div className="rounded-2xl border border-white/10 bg-surface-2/80 p-4 text-xs text-muted leading-relaxed">
                  🔒 <strong>Safety Validation:</strong> All student records and section allocations will be updated in an ACID transaction with complete audit logging.
                </div>

                {promoteResult && (
                  <div className="rounded-2xl border border-teal-light/40 bg-teal-soft p-4 text-xs">
                    <strong className="block text-teal-light font-extrabold text-sm">{promoteResult.message}</strong>
                    <div className="mt-2 flex gap-4 text-ink">
                      <span>Promoted: <strong>{promoteResult.promotedCount}</strong></span>
                      <span>Graduated: <strong>{promoteResult.graduatedCount}</strong></span>
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  disabled={promoteBusy}
                  onClick={() => void handleBatchPromote()}
                  className="w-full"
                >
                  {promoteBusy ? "Executing Cohort Promotion…" : `Promote Year ${fromYear} → Year ${toYear} Cohort`}
                </Button>
              </div>
            </Spotlight>
          </div>
        )}

        {!error && tab === "hod" && (
          <div className="max-w-2xl mx-auto">
            <Spotlight tone="brand" className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
              <h2 className="text-2xl font-extrabold text-white">Assign Head of Department (HOD)</h2>
              <p className="mt-1 text-xs text-muted">
                Designate an active department faculty member as the official Head of Department with Level 3 executive permissions.
              </p>

              <form onSubmit={handleAssignHod} className="mt-6 space-y-4">
                <Field label="Select Appointee from Faculty Roster">
                  <select
                    value={selectedHodUserId}
                    onChange={(e) => setSelectedHodUserId(e.target.value)}
                    className={inputBase}
                    required
                  >
                    <option value="">— Select Faculty Member —</option>
                    {facultyList
                      .filter((f) => f.userId !== undefined)
                      .map((f) => (
                        <option key={f.id} value={f.userId}>
                          {f.name} ({f.designation} · Staff ID: {f.facultyId})
                        </option>
                      ))}
                  </select>
                </Field>

                {hodMsg && (
                  <p className="rounded-xl border border-white/10 bg-surface-2 p-3 text-xs font-bold">
                    {hodMsg}
                  </p>
                )}

                <Button type="submit" variant="primary" disabled={hodBusy} className="w-full">
                  {hodBusy ? "Assigning HOD…" : "Confirm HOD Appointment →"}
                </Button>
              </form>
            </Spotlight>
          </div>
        )}
      </main>
    </div>
  );
}
