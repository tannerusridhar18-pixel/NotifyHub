"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminQueries,
  answerQuery,
  currentUser,
  managedAnnouncements,
  managedEvents,
  createAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
  archiveAnnouncement,
  unarchiveAnnouncement,
  deleteAnnouncement,
  createEvent,
  publishEvent,
  unpublishEvent,
  cancelEvent,
  archiveEvent,
  unarchiveEvent,
  deleteEvent,
  deleteQuery,
  createInvitation,
  invitableRoles,
  structureDepartments,
  structureBranches,
  structureSections,
  structureHostels,
  structureBlocks,
  structureRooms,
} from "@/lib/api";
import type { StructureDepartment, StructureBranch, StructureSection, StructureHostel, StructureBlock, StructureRoom, InvitableRole } from "@/lib/api";
import type { Announcement, CampusQuery, EventItem, TargetType } from "@/types";
import { ErrorState, Empty } from "@/components/States";
import { Toast } from "@/components/Toast";
import { StatusBadge, SoftBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Counter from "@/components/ui/Counter";
import Field from "@/components/ui/Field";
import DetailModal from "@/components/ui/DetailModal";
import { inputBase, textareaBase, cx } from "@/components/ui/classes";
import EventRegistrationFields from "@/components/EventRegistrationFields";

const blankA = { title: "", content: "", urgent: false, targetType: "GLOBAL" as TargetType, departmentId: "", branchId: "", sectionId: "", hostelId: "", userEmail: "", role: "" };
const blankE = {
  title: "",
  description: "",
  location: "",
  startAt: "",
  endAt: "",
  targetType: "GLOBAL" as TargetType,
  departmentId: "",
  branchId: "",
  sectionId: "",
  hostelId: "",
  userEmail: "",
  role: "",
  photoUrl: "",
  externalLink: "",
  registrationEnabled: false,
  registrationDeadline: "",
};
const blankInvite = {
  email: "",
  role: "STUDENT",
  name: "",
  studentId: "",
  facultyId: "",
  departmentId: "",
  branchId: "",
  sectionId: "",
  year: "1",
  semester: "1",
  designation: "",
  hosteller: false,
  hostelId: "",
  blockId: "",
  roomId: "",
};
type Tab = "announcements" | "events" | "queries" | "people";

export default function DashboardClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("announcements");
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [evs, setEvs] = useState<EventItem[]>([]);
  const [queries, setQueries] = useState<CampusQuery[]>([]);
  const [modalItem, setModalItem] = useState<{ type: "announcement"; data: Announcement } | { type: "event"; data: EventItem } | { type: "query"; data: CampusQuery } | null>(null);
  const [identity, setIdentity] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [a, setA] = useState(blankA);
  const [ev, setEv] = useState(blankE);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [invite, setInvite] = useState(blankInvite);
  const [departments, setDepartments] = useState<StructureDepartment[]>([]);
  const [branches, setBranches] = useState<StructureBranch[]>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [hostels, setHostels] = useState<StructureHostel[]>([]);
  const [blocks, setBlocks] = useState<StructureBlock[]>([]);
  const [rooms, setRooms] = useState<StructureRoom[]>([]);
  const [invitableRoleList, setInvitableRoleList] = useState<InvitableRole[]>([]);

  const load = useCallback(async () => {
    const [x, y, z, d, b, s, h, bl, r, rl] = await Promise.all([
      managedAnnouncements(),
      managedEvents(),
      adminQueries(),
      structureDepartments(),
      structureBranches(),
      structureSections(),
      structureHostels(),
      structureBlocks(),
      structureRooms(),
      invitableRoles().catch(() => []),
    ]);
    setAnns(x.content);
    setEvs(y.content);
    setQueries(z.content);
    setDepartments(d);
    setBranches(b);
    setSections(s);
    setHostels(h);
    setBlocks(bl);
    setRooms(r);
    setInvitableRoleList(rl);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await currentUser();
        if (cancelled) return;
        if (!u || u.roleLevel !== 0) {
          router.replace("/");
          return;
        }
        setIdentity(u.email);
        try {
          await load();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to load the control room.");
        }
      } catch {
        if (!cancelled) router.replace("/admin");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, router]);

  const act = useCallback(
    async (fn: () => Promise<unknown>, success: string) => {
      setBusy(true);
      setError("");
      try {
        await fn();
        await load();
        setToast({ message: success, type: "success" });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Operation failed.";
        setError(message);
        setToast({ message, type: "error" });
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  async function submitA(e: React.FormEvent) {
    e.preventDefault();
    if (a.targetType === "ROLE" && !a.role) {
      setError("Choose a role for this audience.");
      return;
    }
    if (a.targetType === "DEPARTMENT" && !a.departmentId) {
      setError("Choose a department for this audience.");
      return;
    }
    if (a.targetType === "BRANCH" && (!a.departmentId || !a.branchId)) {
      setError("Choose a department and branch for this audience.");
      return;
    }
    if (a.targetType === "SECTION" && (!a.departmentId || !a.branchId || !a.sectionId)) {
      setError("Choose a department, branch and section for this audience.");
      return;
    }
    if (a.targetType === "HOSTEL" && !a.hostelId) { setError("Choose a hostel for this audience."); return; }
    if (a.targetType === "USER" && !a.userEmail) { setError("Enter a user email for this audience."); return; }
    await act(async () => {
      await createAnnouncement({
        title: a.title,
        content: a.content,
        urgent: a.urgent,
        targetType: a.targetType,
        departmentId: a.departmentId ? Number(a.departmentId) : undefined,
        branchId: a.branchId ? Number(a.branchId) : undefined,
        sectionId: a.sectionId ? Number(a.sectionId) : undefined,
        hostelId: a.hostelId ? Number(a.hostelId) : undefined,
        userEmail: a.userEmail || undefined,
        role: a.role || undefined,
      });
      setA(blankA);
    }, "Announcement draft saved.");
  }

  async function submitE(e: React.FormEvent) {
    e.preventDefault();
    if (ev.targetType === "ROLE" && !ev.role) {
      setError("Choose a role for this audience.");
      return;
    }
    if (ev.targetType === "DEPARTMENT" && !ev.departmentId) {
      setError("Choose a department for this audience.");
      return;
    }
    if (ev.targetType === "BRANCH" && (!ev.departmentId || !ev.branchId)) {
      setError("Choose a department and branch for this audience.");
      return;
    }
    if (ev.targetType === "SECTION" && (!ev.departmentId || !ev.branchId || !ev.sectionId)) {
      setError("Choose a department, branch and section for this audience.");
      return;
    }
    if (ev.targetType === "HOSTEL" && !ev.hostelId) { setError("Choose a hostel for this audience."); return; }
    if (ev.targetType === "USER" && !ev.userEmail) { setError("Enter a user email for this audience."); return; }
    if (!ev.startAt || !ev.endAt || new Date(ev.endAt) <= new Date(ev.startAt)) {
      setError("End time must be after start time.");
      return;
    }
    await act(async () => {
      await createEvent({
        title: ev.title,
        description: ev.description,
        location: ev.location,
        startAt: new Date(ev.startAt).toISOString(),
        endAt: new Date(ev.endAt).toISOString(),
        targetType: ev.targetType,
        departmentId: ev.departmentId ? Number(ev.departmentId) : undefined,
        branchId: ev.branchId ? Number(ev.branchId) : undefined,
        sectionId: ev.sectionId ? Number(ev.sectionId) : undefined,
        hostelId: ev.hostelId ? Number(ev.hostelId) : undefined,
        userEmail: ev.userEmail || undefined,
        role: ev.role || undefined,
        photoUrl: ev.photoUrl || undefined,
        externalLink: ev.externalLink || undefined,
        registrationEnabled: ev.registrationEnabled,
        registrationDeadline: ev.registrationDeadline ? new Date(ev.registrationDeadline).toISOString() : undefined,
      });
      setEv(blankE);
    }, "Event draft saved.");
  }

  async function answer(id: number) {
    const text = answers[id]?.trim();
    if (!text) return;
    await act(async () => {
      await answerQuery(id, text);
      setAnswers((v) => ({ ...v, [id]: "" }));
    }, "Response sent.");
  }

  function audienceLabel(item: { targetType: TargetType; departmentId?: number | null; branchId?: number | null; sectionId?: number | null; hostelId?: number | null; userEmail?: string | null; role?: string | null }) {
    if (item.targetType === "GLOBAL") return "Everyone";
    if (item.targetType === "ROLE") return item.role || "Role";
    if (item.targetType === "USER") return item.userEmail || "Specific user";
    if (item.targetType === "HOSTEL") return hostels.find((x) => x.id === item.hostelId)?.name || "Hostel";
    if (item.targetType === "SECTION") return sections.find((x) => x.id === item.sectionId)?.name || "Section";
    if (item.targetType === "BRANCH") return branches.find((x) => x.id === item.branchId)?.name || "Branch";
    return departments.find((x) => x.id === item.departmentId)?.name || "Department";
  }

  const inviteBranches = useMemo(() => branches.filter((x) => String(x.departmentId) === invite.departmentId && x.active), [branches, invite.departmentId]);
  const inviteSections = useMemo(() => sections.filter((x) => String(x.branchId) === invite.branchId && x.active), [sections, invite.branchId]);
  const inviteBlocks = useMemo(() => blocks.filter((x) => String(x.hostelId) === invite.hostelId && x.active), [blocks, invite.hostelId]);
  const inviteRooms = useMemo(() => rooms.filter((x) => String(x.blockId) === invite.blockId && x.active), [rooms, invite.blockId]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const selectedRoleObj = invitableRoleList.find((r) => r.name.toUpperCase() === invite.role.toUpperCase());
    await act(async () => {
      await createInvitation({
        email: invite.email,
        role: invite.role,
        roleId: selectedRoleObj?.id,
        departmentId: invite.departmentId ? Number(invite.departmentId) : undefined,
        branchId: invite.branchId ? Number(invite.branchId) : undefined,
        sectionId: invite.sectionId ? Number(invite.sectionId) : undefined,
        profile: {
          name: invite.name,
          studentId: invite.role === "STUDENT" ? invite.studentId : undefined,
          facultyId: invite.role !== "STUDENT" ? invite.facultyId : undefined,
          departmentId: invite.departmentId ? Number(invite.departmentId) : undefined,
          branchId: invite.branchId ? Number(invite.branchId) : undefined,
          sectionId: invite.sectionId ? Number(invite.sectionId) : undefined,
          year: invite.role === "STUDENT" ? Number(invite.year) : undefined,
          semester: invite.role === "STUDENT" ? Number(invite.semester) : undefined,
          designation: invite.role !== "STUDENT" && invite.designation ? invite.designation : undefined,
          hosteller: invite.role === "STUDENT" ? invite.hosteller : undefined,
          hostelId: invite.hosteller && invite.hostelId ? Number(invite.hostelId) : undefined,
          blockId: invite.hosteller && invite.blockId ? Number(invite.blockId) : undefined,
          roomId: invite.hosteller && invite.roomId ? Number(invite.roomId) : undefined,
        },
      });
      setInvite(blankInvite);
    }, "Invitation created. Email delivery is being processed.");
  }

  const pending = queries.filter((q) => q.status === "OPEN").length;

  return (
    <div className="mx-auto w-full max-w-[1450px] px-4 py-8 sm:px-8 sm:py-10 lg:px-[clamp(20px,4vw,60px)]">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <header className="mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-50/90 px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-brand-light uppercase shadow-[0_0_12px_rgba(99,102,241,0.2)] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-light animate-pulse" />
            Operations Control Room
          </span>
          <h1 className="mt-2 text-[32px] leading-tight sm:text-4xl lg:text-[46px] font-extrabold">
            {tab === "announcements" ? "Campus announcements" : tab === "events" ? "Campus events" : tab === "queries" ? "Questions inbox" : "People & invitations"}
          </h1>
          <p className="mt-2.5 max-w-[650px] text-[13px] leading-relaxed text-muted/90">A focused workspace for publishing, scheduling, and provisioning real-time campus communication.</p>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <span className="flex items-center gap-2 rounded-full border border-teal-light/40 bg-teal-soft/90 px-3 py-1.5 text-[10px] font-extrabold text-teal-light shadow-[0_0_12px_rgba(45,212,191,0.2)] backdrop-blur-md">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-light opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-light" />
            </span>
            System live
          </span>
          <span className="text-[11px] font-semibold text-muted bg-surface-2/90 px-3 py-1.5 rounded-full border border-white/[0.06]">{identity}</span>
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={() => void load().catch((e) => setError(e instanceof Error ? e.message : "Unable to reload."))} />}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          className={cx(
            "rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover",
            "min-h-[148px] backdrop-blur-xl",
            tab === "announcements"
              ? "border-brand-light/60 bg-gradient-to-br from-surface-2 via-brand-50 to-surface-3 shadow-glow"
              : "border-white/[0.08] bg-gradient-to-br from-surface/95 to-surface-2/95 text-ink"
          )}
          onClick={() => setTab("announcements")}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-light">Published signal</span>
          <strong className="my-3 block font-display text-4xl sm:text-5xl font-extrabold text-white"><Counter value={anns.filter((x) => x.status === "PUBLISHED").length} /></strong>
          <small className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-light" /> Announcement records
          </small>
        </button>
        <button
          className={cx(
            "min-h-[148px] rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover backdrop-blur-xl",
            tab === "events"
              ? "border-brand-2/60 bg-gradient-to-br from-surface-2 via-brand-50 to-surface-3 shadow-glow-violet"
              : "border-white/[0.08] bg-gradient-to-br from-surface/95 to-surface-2/95 text-ink"
          )}
          onClick={() => setTab("events")}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-2-light">Published activity</span>
          <strong className="my-3 block font-display text-4xl sm:text-5xl font-extrabold text-white"><Counter value={evs.filter((x) => x.status === "PUBLISHED").length} /></strong>
          <small className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-2" /> Event records
          </small>
        </button>
        <button
          className={cx(
            "min-h-[148px] rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover backdrop-blur-xl",
            tab === "queries"
              ? "border-amber/60 bg-gradient-to-br from-surface-2 via-warning-soft to-surface-3 shadow-glow-amber"
              : "border-white/[0.08] bg-gradient-to-br from-surface/95 to-surface-2/95 text-ink"
          )}
          onClick={() => setTab("queries")}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-light">Needs attention</span>
          <strong className="my-3 block font-display text-4xl sm:text-5xl font-extrabold text-white"><Counter value={pending} /></strong>
          <small className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Unanswered questions
          </small>
        </button>
        <div className="flex min-h-[148px] items-start gap-3.5 rounded-2xl border border-brand/40 bg-gradient-to-br from-brand-50/95 via-surface-2/90 to-surface/95 p-5 sm:col-span-2 lg:col-span-1 shadow-lift backdrop-blur-xl">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-surface-2 text-brand-light shadow-glow text-base">✦</span>
          <div>
            <strong className="font-display font-bold text-ink">Control-room rule</strong>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted/90 font-medium">Draft first. Publish only after audience, timing and wording are ready.</p>
          </div>
        </div>
      </div>

      <div role="tablist" className="mb-6 flex w-max max-w-full gap-1.5 overflow-auto rounded-2xl bg-surface-2/90 p-1.5 border border-white/[0.08] backdrop-blur-xl">
        {(["announcements", "events", "queries", "people"] as Tab[]).map((x) => (
          <button
            key={x}
            role="tab"
            aria-selected={tab === x}
            className={cx(
              "whitespace-nowrap rounded-xl px-4 py-2.5 text-[11px] font-extrabold tracking-wide uppercase transition-all duration-200",
              tab === x ? "bg-brand-50 text-white shadow-soft border border-brand/50" : "text-muted hover:bg-surface/60 hover:text-white"
            )}
            onClick={() => setTab(x)}
          >
            {x === "people" ? "People & invites" : x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>


      {tab === "announcements" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(330px,0.7fr)_minmax(0,1.3fr)]">
          <form className="min-w-0 rounded-[18px] border-t-[3px] border-brand bg-surface p-5 shadow-soft" onSubmit={submitA}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-extrabold text-brand">Composer</span>
                <h2 className="mt-1.5 text-lg">Save an announcement draft</h2>
              </div>
              <SoftBadge>DRAFT</SoftBadge>
            </div>
            <AudienceFields value={a} onChange={(patch) => setA((v) => ({ ...v, ...patch }))} departments={departments} branches={branches} sections={sections} hostels={hostels} />
            <Field label="Title" htmlFor="ann-title" className="mb-4">
              <input id="ann-title" required className={inputBase} maxLength={180} value={a.title} onChange={(e) => setA((v) => ({ ...v, title: e.target.value }))} />
            </Field>
            <Field label="Message" htmlFor="ann-content" className="mb-4">
              <textarea id="ann-content" required className={textareaBase} maxLength={10000} value={a.content} onChange={(e) => setA((v) => ({ ...v, content: e.target.value }))} />
            </Field>
            <label className="mb-4 flex items-center gap-2 text-[11px] font-semibold text-muted">
              <input type="checkbox" className="accent-brand" checked={a.urgent} onChange={(e) => setA((v) => ({ ...v, urgent: e.target.checked }))} />
              <span>Mark as urgent signal</span>
            </label>
            <Button disabled={busy}>{busy ? "Saving…" : "Save draft"}</Button>
          </form>
          <section className="min-w-0 rounded-[18px] border border-border bg-surface p-5 shadow-soft">
            <QueueHeader label="Announcement queue" count={anns.length} />
            <div className="scroll-thin overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[680px] border-collapse bg-surface text-[11px]">
                <thead>
                  <tr>
                    <th className="border-b border-border bg-surface-2 p-3 text-left text-[9px] font-bold uppercase tracking-wide text-muted">Signal</th>
                    <th className="border-b border-border bg-surface-2 p-3 text-left text-[9px] font-bold uppercase tracking-wide text-muted">Audience</th>
                    <th className="border-b border-border bg-surface-2 p-3 text-left text-[9px] font-bold uppercase tracking-wide text-muted">Status</th>
                    <th className="border-b border-border bg-surface-2 p-3 text-left text-[9px] font-bold uppercase tracking-wide text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {anns.length ? (
                    anns.map((x) => (
                      <tr key={x.id} className="last:[&>td]:border-b-0">
                        <td className="border-b border-border p-3 align-top">
                          <b className="block">{x.title}</b>
                          <small className="mt-1 block text-[9px] text-muted">
                            {x.urgent ? "Urgent · " : ""}
                            {new Date(x.createdAt).toLocaleString()}
                          </small>
                        </td>
                        <td className="border-b border-border p-3 align-top">{audienceLabel(x)}</td>
                        <td className="border-b border-border p-3 align-top">
                          <StatusBadge status={x.status} />
                        </td>
                        <td className="flex flex-wrap gap-1.5 border-b border-border p-3 align-top">
                          {x.status === "DRAFT" && (
                            <button
                              className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-[9px] font-extrabold text-brand-2"
                              onClick={() => void act(() => publishAnnouncement(x.id), "Announcement published.")}
                            >
                              Publish
                            </button>
                          )}
                          {x.status === "PUBLISHED" && (
                            <button
                              className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-[9px] font-extrabold text-brand-2"
                              onClick={() => void act(() => unpublishAnnouncement(x.id), "Announcement unpublished.")}
                            >
                              Unpublish
                            </button>
                          )}
                          {x.status !== "ARCHIVED" && (
                            <button
                              className="rounded-lg border border-danger-soft bg-danger-soft px-2.5 py-1.5 text-[9px] font-extrabold text-[#ffb4ac]"
                              onClick={() => void act(() => archiveAnnouncement(x.id), "Announcement archived.")}
                            >
                              Archive
                            </button>
                          )}
                          {x.status !== "PUBLISHED" && (
                            <button
                              className="rounded-lg border border-danger-soft bg-danger-soft px-2.5 py-1.5 text-[9px] font-extrabold text-[#ffb4ac]"
                              onClick={() => void act(() => deleteAnnouncement(x.id), "Announcement deleted.")}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>
                        <Empty label="announcements" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "events" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(400px,0.85fr)_minmax(0,1.15fr)]">
          <form className="min-w-0 rounded-[18px] border-t-[3px] border-brand bg-surface p-6 shadow-soft" onSubmit={submitE}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-extrabold text-brand">Scheduler</span>
                <h2 className="mt-1.5 text-lg">Save an event draft</h2>
              </div>
              <SoftBadge>DRAFT</SoftBadge>
            </div>
            <AudienceFields value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} departments={departments} branches={branches} sections={sections} hostels={hostels} />
            <EventRegistrationFields value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} />
            <Field label="Event title" htmlFor="event-title" className="mb-4">
              <input id="event-title" required className={inputBase} maxLength={180} value={ev.title} onChange={(e) => setEv((v) => ({ ...v, title: e.target.value }))} />
            </Field>
            <Field label="Venue" htmlFor="event-location" className="mb-4">
              <input id="event-location" required className={inputBase} maxLength={180} value={ev.location} onChange={(e) => setEv((v) => ({ ...v, location: e.target.value }))} />
            </Field>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Time · Starts" htmlFor="event-start" className="min-w-0">
                <input
                  id="event-start"
                  required
                  className={`${inputBase} h-[46px] min-w-0 text-xs sm:text-sm`}
                  type="datetime-local"
                  value={ev.startAt}
                  onChange={(e) => setEv((v) => ({ ...v, startAt: e.target.value }))}
                />
                <small className="mt-1 block text-[10px] text-muted">Local time, 24-hour format</small>
              </Field>
              <Field label="Time · Ends" htmlFor="event-end" className="min-w-0">
                <input
                  id="event-end"
                  required
                  className={`${inputBase} h-[46px] min-w-0 text-xs sm:text-sm`}
                  type="datetime-local"
                  value={ev.endAt}
                  onChange={(e) => setEv((v) => ({ ...v, endAt: e.target.value }))}
                />
                <small className="mt-1 block text-[10px] text-muted">Local time, 24-hour format</small>
              </Field>
            </div>
            <Field label="Description" htmlFor="event-description" className="mb-4">
              <textarea
                id="event-description"
                required
                className={textareaBase}
                maxLength={10000}
                value={ev.description}
                onChange={(e) => setEv((v) => ({ ...v, description: e.target.value }))}
              />
            </Field>
            <Button disabled={busy}>{busy ? "Saving…" : "Save draft"}</Button>
          </form>
          <section className="min-w-0 rounded-[18px] border border-border bg-surface p-5 shadow-soft">
            <QueueHeader label="Event queue" count={evs.length} />
            <div className="scroll-thin overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[680px] border-collapse bg-surface text-[11px]">
                <thead>
                  <tr>
                    <th className="border-b border-border bg-surface-2 p-3 text-left text-[9px] font-bold uppercase tracking-wide text-muted">Event</th>
                    <th className="border-b border-border bg-surface-2 p-3 text-left text-[9px] font-bold uppercase tracking-wide text-muted">When</th>
                    <th className="border-b border-border bg-surface-2 p-3 text-left text-[9px] font-bold uppercase tracking-wide text-muted">Status</th>
                    <th className="border-b border-border bg-surface-2 p-3 text-left text-[9px] font-bold uppercase tracking-wide text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evs.length ? (
                    evs.map((x) => (
                      <tr key={x.id}>
                        <td className="border-b border-border p-3 align-top">
                          <b className="block">{x.title}</b>
                          <small className="mt-1 block text-[9px] text-muted">{x.location}</small>
                        </td>
                        <td className="border-b border-border p-3 align-top">{audienceLabel(x)} · {new Date(x.startAt).toLocaleString()}</td>
                        <td className="border-b border-border p-3 align-top">
                          <StatusBadge status={x.status} />
                        </td>
                        <td className="flex flex-wrap gap-1.5 border-b border-border p-3 align-top">
                          {(x.status === "DRAFT" || x.status === "ARCHIVED") && (
                            <button
                              className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-[9px] font-extrabold text-brand-2"
                              onClick={() => void act(() => publishEvent(x.id), "Event published.")}
                            >
                              Publish
                            </button>
                          )}
                          {x.status === "PUBLISHED" && (
                            <button
                              className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-[9px] font-extrabold text-brand-2"
                              onClick={() => void act(() => unpublishEvent(x.id), "Event unpublished.")}
                            >
                              Unpublish
                            </button>
                          )}
                          {x.status !== "CANCELLED" && x.status !== "ARCHIVED" && (
                            <button
                              className="rounded-lg border border-danger-soft bg-danger-soft px-2.5 py-1.5 text-[9px] font-extrabold text-[#ffb4ac]"
                              onClick={() => void act(() => cancelEvent(x.id), "Event cancelled.")}
                            >
                              Cancel
                            </button>
                          )}
                          {true && (
                            <button
                              className="rounded-lg border border-danger-soft bg-danger-soft px-2.5 py-1.5 text-[9px] font-extrabold text-[#ffb4ac]"
                              onClick={() => void act(() => archiveEvent(x.id), "Event archived.")}
                            >
                              Archive
                            </button>
                          )}
                          {x.status !== "PUBLISHED" && (
                            <button
                              className="rounded-lg border border-danger-soft bg-danger-soft px-2.5 py-1.5 text-[9px] font-extrabold text-[#ffb4ac]"
                              onClick={() => void act(() => deleteEvent(x.id), "Event deleted.")}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>
                        <Empty label="events" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "queries" && (
        <div className="grid gap-3.5 md:grid-cols-2">
          {queries.length ? (
            queries.map((q) => (
              <article className="min-w-0 rounded-[18px] border border-border bg-surface p-5 shadow-soft" key={q.id}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <SoftBadge>{q.department}</SoftBadge>
                  <StatusBadge status={q.status} />
                </div>
                <h2 className="text-xl">{q.subject}</h2>
                <p className="text-[10px] text-muted">
                  {q.name} · {q.email}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted line-clamp-3">{q.message}</p>
                <button
                  type="button"
                  onClick={() => setModalItem({ type: "query", data: q })}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-light hover:underline"
                >
                  Read full query / details →
                </button>
                {q.adminResponse && (
                  <div className="mt-3 rounded-xl bg-success-soft p-3 text-[11px] leading-relaxed text-[#8ff0c8]">
                    <span className="mb-1 block text-[8px] font-extrabold uppercase tracking-[0.1em]">Response</span>
                    {q.adminResponse}
                  </div>
                )}
                {q.status === "OPEN" && (
                  <>
                    <textarea
                      className={`${textareaBase} mt-3`}
                      placeholder="Write a response…"
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers((v) => ({ ...v, [q.id]: e.target.value }))}
                    />
                    <Button className="mt-3" onClick={() => void answer(q.id)}>
                      Send response
                    </Button>
                  </>
                )}
                {q.status === "ANSWERED" && (
                  <button
                    className="mt-3 rounded-lg border border-danger-soft bg-danger-soft px-2.5 py-1.5 text-[9px] font-extrabold text-[#ffb4ac]"
                    onClick={() => void act(() => deleteQuery(q.id), "Query deleted.")}
                  >
                    Delete
                  </button>
                )}
              </article>
            ))
          ) : (
            <div className="col-span-full rounded-[18px] border border-border bg-surface py-16 text-center shadow-soft">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-[#8ff0c8]">✓</span>
              <h2 className="mt-3 text-xl">Inbox is clear</h2>
              <p className="text-xs text-muted">No campus questions need an answer right now.</p>
            </div>
          )}
        </div>
      )}

      {tab === "people" && (
        <section className="overflow-hidden rounded-[18px] border border-border bg-surface p-5 shadow-soft">
          <div className="relative -mx-5 -mt-5 mb-6 flex flex-col items-start justify-between gap-5 overflow-hidden bg-gradient-to-br from-ink-900 to-ink-700 p-6 text-ink sm:flex-row sm:items-center">
            <div>
              <span className="text-[11px] font-extrabold text-brand-2">Identity provisioning</span>
              <h2 className="my-2 text-2xl">Invite a campus member</h2>
              <p className="max-w-[570px] text-xs leading-relaxed text-muted">Choose structure names from the records you already created. The backend receives their IDs automatically.</p>
            </div>
          </div>
          <form onSubmit={sendInvite} className="grid gap-x-4 sm:grid-cols-2">
            <SectionHeading number="01" title="Identity" subtitle="Basic account details." />
            <Field label="Email" htmlFor="invite-email">
              <input id="invite-email" required type="email" className={inputBase} value={invite.email} onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))} />
            </Field>
            <Field label="Role" htmlFor="invite-role">
              <select
                id="invite-role"
                className={inputBase}
                value={invite.role}
                onChange={(e) => setInvite((v) => ({ ...v, role: e.target.value, branchId: "", sectionId: "" }))}
              >
                {invitableRoleList.length > 0 ? (
                  invitableRoleList
                    .filter((r) => r.name !== "SUPER_ADMIN")
                    .map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name.replace(/_/g, " ")} {r.level !== undefined ? `(L${r.level})` : ""}
                      </option>
                    ))
                ) : (
                  <>
                    <option value="ADMIN">Admin (L1)</option>
                    <option value="DEPARTMENT_ADMIN">Department Admin (L3)</option>
                    <option value="PRINCIPAL">Principal (L1)</option>
                    <option value="DEAN">Dean (L2)</option>
                    <option value="HOD">HOD / Head of Department (L3)</option>
                    <option value="FACULTY">Faculty (L4)</option>
                    <option value="STUDENT">Student (L5)</option>
                  </>
                )}
              </select>
            </Field>
            <Field label="Full name" htmlFor="invite-name">
              <input id="invite-name" required className={inputBase} value={invite.name} onChange={(e) => setInvite((v) => ({ ...v, name: e.target.value }))} />
            </Field>
            <Field
              label={
                invite.role === "STUDENT"
                  ? "Student ID"
                  : invite.role === "PRINCIPAL"
                  ? "Principal ID (Optional)"
                  : invite.role === "DEAN"
                  ? "Dean ID (Optional)"
                  : invite.role === "ADMIN"
                  ? "Admin ID (Optional)"
                  : invite.role === "FACULTY" || invite.role === "HOD"
                  ? "Faculty ID"
                  : `${invite.role.replace(/_/g, " ")} Identifier (Optional)`
              }
              htmlFor="invite-idnum"
            >
              <input
                id="invite-idnum"
                required={invite.role === "STUDENT" || invite.role === "FACULTY" || invite.role === "HOD"}
                className={inputBase}
                value={invite.role === "STUDENT" ? invite.studentId : invite.facultyId}
                onChange={(e) => setInvite((v) => ({ ...v, [invite.role === "STUDENT" ? "studentId" : "facultyId"]: e.target.value }))}
              />
            </Field>

            <SectionHeading number="02" title="Academic placement" subtitle="Names come from Structure. Admin, Principal and Dean are campus-wide." />
            <Field label="Department" htmlFor="invite-department">
              <select
                id="invite-department"
                required={invite.role !== "PRINCIPAL" && invite.role !== "DEAN" && invite.role !== "ADMIN"}
                className={inputBase}
                value={invite.departmentId}
                onChange={(e) => setInvite((v) => ({ ...v, departmentId: e.target.value, branchId: "", sectionId: "" }))}
              >
                <option value="">{invite.role === "PRINCIPAL" || invite.role === "DEAN" || invite.role === "ADMIN" ? "None (Campus-wide)" : "Choose department"}</option>
                {departments.filter((x) => x.active).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            {invite.role === "STUDENT" && (
              <Field label="Branch / program" htmlFor="invite-branch">
                <select
                  id="invite-branch"
                  required
                  disabled={!invite.departmentId}
                  className={inputBase}
                  value={invite.branchId}
                  onChange={(e) => setInvite((v) => ({ ...v, branchId: e.target.value, sectionId: "" }))}
                >
                  <option value="">Choose branch</option>
                  {inviteBranches.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {invite.role === "STUDENT" && (
              <Field label="Section" htmlFor="invite-section">
                <select
                  id="invite-section"
                  required
                  disabled={!invite.branchId}
                  className={inputBase}
                  value={invite.sectionId}
                  onChange={(e) => setInvite((v) => ({ ...v, sectionId: e.target.value }))}
                >
                  <option value="">Choose section</option>
                  {inviteSections.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · Year {x.academicYear}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {invite.role === "STUDENT" && (
              <>
                <Field label="Academic year" htmlFor="invite-year">
                  <input id="invite-year" required type="number" min="1" className={inputBase} value={invite.year} onChange={(e) => setInvite((v) => ({ ...v, year: e.target.value }))} />
                </Field>
                <Field label="Semester" htmlFor="invite-semester">
                  <input
                    id="invite-semester"
                    required
                    type="number"
                    min="1"
                    className={inputBase}
                    value={invite.semester}
                    onChange={(e) => setInvite((v) => ({ ...v, semester: e.target.value }))}
                  />
                </Field>
              </>
            )}
            {invite.role === "FACULTY" && (
              <Field label="Designation" htmlFor="invite-designation">
                <input
                  id="invite-designation"
                  required
                  className={inputBase}
                  value={invite.designation}
                  onChange={(e) => setInvite((v) => ({ ...v, designation: e.target.value }))}
                />
              </Field>
            )}

            {invite.role === "STUDENT" && (
              <>
                <SectionHeading number="03" title="Hostel placement" subtitle="Optional residential assignment." />
                <label className="col-span-full mb-1 flex items-center gap-2 text-[11px] font-semibold text-muted">
                  <input
                    type="checkbox"
                    className="accent-brand"
                    checked={invite.hosteller}
                    onChange={(e) => setInvite((v) => ({ ...v, hosteller: e.target.checked, hostelId: e.target.checked ? v.hostelId : "", blockId: "", roomId: "" }))}
                  />
                  <span>Student is a hosteller</span>
                </label>
                {invite.hosteller && (
                  <>
                    <Field label="Hostel" htmlFor="invite-hostel">
                      <select
                        id="invite-hostel"
                        required
                        className={inputBase}
                        value={invite.hostelId}
                        onChange={(e) => setInvite((v) => ({ ...v, hostelId: e.target.value, blockId: "", roomId: "" }))}
                      >
                        <option value="">Choose hostel</option>
                        {hostels.filter((x) => x.active).map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Block" htmlFor="invite-block">
                      <select
                        id="invite-block"
                        required
                        disabled={!invite.hostelId}
                        className={inputBase}
                        value={invite.blockId}
                        onChange={(e) => setInvite((v) => ({ ...v, blockId: e.target.value, roomId: "" }))}
                      >
                        <option value="">Choose block</option>
                        {inviteBlocks.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Room" htmlFor="invite-room">
                      <select
                        id="invite-room"
                        required
                        disabled={!invite.blockId}
                        className={inputBase}
                        value={invite.roomId}
                        onChange={(e) => setInvite((v) => ({ ...v, roomId: e.target.value }))}
                      >
                        <option value="">Choose room</option>
                        {inviteRooms.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.roomNumber} · {x.currentOccupancy}/{x.capacity}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
              </>
            )}

            <div className="col-span-full mt-2 flex flex-wrap items-center gap-3.5 border-t border-border pt-4">
              <Button disabled={busy}>{busy ? "Sending invitation…" : "Send invitation email →"}</Button>
              <span className="text-[9px] text-muted">Invitation expiry follows the backend configuration.</span>
            </div>
          </form>
        </section>
      )}
      <DetailModal item={modalItem} onClose={() => setModalItem(null)} />
    </div>
  );
}

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="col-span-full mt-1 flex gap-3 border-t border-border py-4 first:mt-0 first:border-t-0 first:pt-0">
      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand-50 font-display text-[9px] font-bold text-brand">{number}</span>
      <div>
        <h3 className="text-[15px]">{title}</h3>
        <p className="mt-0.5 text-[10px] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function QueueHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <span className="text-[11px] font-extrabold text-brand">Lifecycle</span>
        <h2 className="mt-1.5 text-lg">{label}</h2>
      </div>
      <span className="whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-1.5 text-[9px] font-extrabold text-muted">{count} records</span>
    </div>
  );
}

function AudienceFields({
  value,
  onChange,
  departments,
  branches,
  sections,
  hostels,
}: {
  value: { targetType: TargetType; departmentId: string; branchId: string; sectionId: string; hostelId: string; userEmail: string; role: string };
  onChange: (v: Partial<typeof value>) => void;
  departments: StructureDepartment[];
  branches: StructureBranch[];
  sections: StructureSection[];
  hostels: StructureHostel[];
}) {
  const target = value.targetType;
  const filteredBranches = branches.filter((x) => x.active && (!value.departmentId || String(x.departmentId) === value.departmentId));
  const filteredSections = sections.filter((x) => x.active && (!value.branchId || String(x.branchId) === value.branchId));
  return (
    <div className="mb-4 rounded-xl border border-border bg-surface-2 p-3">
      <Field label="Audience" htmlFor="audience-target">
        <select
          id="audience-target"
          className={inputBase}
          value={target}
          onChange={(e) => onChange({ targetType: e.target.value as TargetType, departmentId: "", branchId: "", sectionId: "", hostelId: "", userEmail: "", role: "" })}
        >
          <option value="GLOBAL">Everyone</option>
          <option value="ROLE">By role</option>
          <option value="DEPARTMENT">Department</option>
          <option value="BRANCH">Branch</option>
          <option value="SECTION">Section</option>
          <option value="HOSTEL">Hostel</option>
          <option value="USER">Specific user</option>
        </select>
      </Field>
      {target === "ROLE" && (
        <Field label="Role" htmlFor="audience-role" className="mt-3">
          <select id="audience-role" className={inputBase} value={value.role} onChange={(e) => onChange({ role: e.target.value })}>
            <option value="">Choose target role</option>
            <option value="PRINCIPAL">Principal (L1)</option>
            <option value="DEAN">Dean (L2)</option>
            <option value="HOD">HOD / Department Heads (L3)</option>
            <option value="FACULTY">Faculty (L4)</option>
            <option value="STUDENT">Student (L5)</option>
          </select>
        </Field>
      )}
      {target === "USER" && (
        <Field label="User email" htmlFor="audience-user-email" className="mt-3">
          <input id="audience-user-email" required type="email" className={inputBase} value={value.userEmail} onChange={(e) => onChange({ userEmail: e.target.value })} placeholder="person@campus.edu" />
        </Field>
      )}
      {target === "HOSTEL" && (
        <Field label="Hostel" htmlFor="audience-hostel" className="mt-3">
          <select id="audience-hostel" required className={inputBase} value={value.hostelId} onChange={(e) => onChange({ hostelId: e.target.value })}>
            <option value="">Choose hostel</option>
            {hostels.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
      )}
      {target !== "GLOBAL" && target !== "ROLE" && (
        <Field label="Department" htmlFor="audience-department" className="mt-3">
          <select
            id="audience-department"
            required
            className={inputBase}
            value={value.departmentId}
            onChange={(e) => onChange({ departmentId: e.target.value, branchId: "", sectionId: "" })}
          >
            <option value="">Choose department</option>
            {departments.filter((x) => x.active).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {(target === "BRANCH" || target === "SECTION") && (
        <Field label="Branch" htmlFor="audience-branch" className="mt-3">
          <select
            id="audience-branch"
            required
            className={inputBase}
            disabled={!value.departmentId}
            value={value.branchId}
            onChange={(e) => onChange({ branchId: e.target.value, sectionId: "" })}
          >
            <option value="">Choose branch</option>
            {filteredBranches.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {target === "SECTION" && (
        <Field label="Section" htmlFor="audience-section" className="mt-3">
          <select id="audience-section" required className={inputBase} disabled={!value.branchId} value={value.sectionId} onChange={(e) => onChange({ sectionId: e.target.value })}>
            <option value="">Choose section</option>
            {filteredSections.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
      )}
    </div>
  );
}
