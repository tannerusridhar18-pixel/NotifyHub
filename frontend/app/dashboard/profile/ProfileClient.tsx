"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  currentUser,
  structureDepartments,
  structureBranches,
  structureSections,
  structureHostels,
  type CurrentUser,
  type StructureDepartment,
  type StructureBranch,
  type StructureSection,
  type StructureHostel,
} from "@/lib/api";
import { buttonClasses } from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { ErrorState } from "@/components/States";

export default function ProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [departments, setDepartments] = useState<StructureDepartment[]>([]);
  const [branches, setBranches] = useState<StructureBranch[]>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [hostels, setHostels] = useState<StructureHostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const u = await currentUser();
        if (cancelled) return;
        setUser(u);

        // Fetch structure asynchronously for rich display names
        try {
          const [deps, brs, secs, hsts] = await Promise.all([
            structureDepartments().catch(() => []),
            structureBranches().catch(() => []),
            structureSections().catch(() => []),
            structureHostels().catch(() => []),
          ]);
          if (!cancelled) {
            setDepartments(deps);
            setBranches(brs);
            setSections(secs);
            setHostels(hsts);
          }
        } catch {
          // Gracefully fallback to raw IDs if structure calls fail
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load profile data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-content-center place-items-center gap-4 text-ink">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white font-black shadow-glow animate-spin-slow text-lg">
          ◈
        </div>
        <p className="text-sm font-bold tracking-wide text-muted">Retrieving your profile credentials…</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-16">
        <ErrorState
          message={error || "Profile could not be loaded."}
          onRetry={() => {
            window.location.reload();
          }}
        />
      </div>
    );
  }

  const isStudent = user.roleLevel === 5;
  const isFaculty = user.roleLevel === 4;
  const student = user.student;
  const faculty = user.faculty;

  const resolvedDept = departments.find(
    (d) => d.id === (isStudent ? student?.departmentId : faculty?.departmentId)
  )?.name;

  const resolvedBranch = branches.find((b) => b.id === student?.branchId)?.name;
  const resolvedSection = sections.find((s) => s.id === student?.sectionId)?.name;

  const dashboardHref =
    fromParam === "faculty" || isFaculty
      ? "/dashboard/faculty"
      : isStudent || fromParam === "student"
      ? "/dashboard/student"
      : "/admin/dashboard";

  const fullName = isStudent ? student?.name : isFaculty ? faculty?.name : user.email.split("@")[0];

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-10 sm:py-14 sm:px-6">
      {/* Top Banner / Breadcrumb */}
      <Reveal className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted mb-2">
            <Link href={dashboardHref} className="hover:text-brand-light transition-colors">
              Workspace
            </Link>
            <span>/</span>
            <span className="text-white">Account Profile</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            User Account & Profile
          </h1>
          <p className="text-muted text-sm sm:text-base mt-1">
            Authenticated campus profile and access credentials.
          </p>
        </div>

        <Link href={dashboardHref} className={buttonClasses("secondary", "!px-4 !py-2 !text-xs")}>
          ← Back to Workspace
        </Link>
      </Reveal>

      {/* Main Profile Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: ID Card / Summary */}
        <Reveal className="md:col-span-1 rounded-2xl border border-white/12 bg-surface/90 p-6 backdrop-blur-2xl shadow-lift">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-3xl font-extrabold text-white shadow-glow">
                {fullName ? fullName.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-success text-[10px] text-white font-black shadow-md">
                ✓
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white">{fullName}</h2>
            <p className="text-xs font-semibold text-muted mt-0.5">{user.email}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-light">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-light" />
                {user.role} ROLE
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-light/30 bg-teal-soft px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-light">
                {user.accountStatus || "ACTIVE"}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted font-semibold">Account ID</span>
              <span className="font-mono text-[11px] text-ink">{user.publicId?.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted font-semibold">Session Status</span>
              <span className="text-success font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Verified
              </span>
            </div>
          </div>
        </Reveal>

        {/* Right Column: Detailed Academic / Role Info */}
        <Reveal delay={80} className="md:col-span-2 space-y-6">
          {/* Academic / Employment Profile Details */}
          <div className="rounded-2xl border border-white/12 bg-surface/90 p-6 backdrop-blur-2xl shadow-lift">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.08]">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-50 text-xs text-brand-light">
                  ◈
                </span>
                {isStudent ? "Academic Record & Enrollment" : isFaculty ? "Faculty & Departmental Assignment" : "Administrative Account"}
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                Official Record
              </span>
            </div>

            {isStudent && student && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Student ID / Roll No
                  </span>
                  <strong className="text-sm font-extrabold text-white mt-1 block">
                    {student.studentId || "—"}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Department
                  </span>
                  <strong className="text-sm font-extrabold text-white mt-1 block">
                    {resolvedDept || (student.departmentId ? `Dept ID #${student.departmentId}` : "—")}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Branch / Program
                  </span>
                  <strong className="text-sm font-extrabold text-white mt-1 block">
                    {resolvedBranch || (student.branchId ? `Branch #${student.branchId}` : "—")}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Academic Standing
                  </span>
                  <strong className="text-sm font-extrabold text-white mt-1 block">
                    Year {student.year || "—"} · Semester {student.semester || "—"}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Section
                  </span>
                  <strong className="text-sm font-extrabold text-white mt-1 block">
                    {resolvedSection || (student.sectionId ? `Section #${student.sectionId}` : "—")}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Residency Status
                  </span>
                  <strong className="text-sm font-extrabold text-teal-light mt-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-light" />
                    {student.hosteller ? "Campus Hosteller" : "Day Scholar"}
                  </strong>
                </div>
              </div>
            )}

            {isFaculty && faculty && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Faculty ID / Employee Code
                  </span>
                  <strong className="text-sm font-extrabold text-white mt-1 block">
                    {faculty.facultyId || "—"}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Designation
                  </span>
                  <strong className="text-sm font-extrabold text-brand-2-light mt-1 block">
                    {faculty.designation || "Faculty Member"}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4 sm:col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Academic Department
                  </span>
                  <strong className="text-sm font-extrabold text-white mt-1 block">
                    {resolvedDept || (faculty.departmentId ? `Dept ID #${faculty.departmentId}` : "General Faculty")}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Contact & Communication Channels */}
          <div className="rounded-2xl border border-white/12 bg-surface/90 p-6 backdrop-blur-2xl shadow-lift">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.08]">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-teal-soft text-xs text-teal-light">
                  ✉
                </span>
                Contact & Communication Details
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                  Official Campus Email
                </span>
                <strong className="text-sm font-semibold text-white mt-1 block break-all">
                  {user.email}
                </strong>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                  Phone Number
                </span>
                <strong className="text-sm font-semibold text-ink mt-1 block">
                  {(isStudent ? student?.phone : faculty?.phone) || "Not registered"}
                </strong>
              </div>

              {isStudent && (
                <div className="rounded-xl border border-white/[0.06] bg-surface-2/70 p-4 sm:col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Personal Email Address
                  </span>
                  <strong className="text-sm font-semibold text-ink mt-1 block break-all">
                    {student?.personalEmail || "Not registered"}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
