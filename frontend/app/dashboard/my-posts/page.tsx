"use client";

import { useEffect, useState } from "react";
import {
  deleteAnnouncement,
  deleteEvent,
  myAnnouncements,
  myEvents,
  updateAnnouncement,
  updateEvent,
  type AnnouncementPayload,
  type EventPayload,
} from "@/lib/api";
import type { Announcement, EventItem } from "@/types";

const inputClass = "w-full rounded-xl border border-white/10 bg-surface-2/80 px-3 py-2 text-sm text-ink outline-none focus:border-brand-light";

export default function MyPostsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [announcementPage, eventPage] = await Promise.all([myAnnouncements(), myEvents()]);
    setAnnouncements(announcementPage.content);
    setEvents(eventPage.content);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load your posts."));
  }, []);

  async function remove(kind: "announcement" | "event", id: number) {
    if (!window.confirm("Delete this post?")) return;
    try {
      if (kind === "announcement") await deleteAnnouncement(id);
      else await deleteEvent(id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete this post.");
    }
  }

  async function saveAnnouncement(item: Announcement, form: FormData) {
    const payload: AnnouncementPayload = {
      title: String(form.get("title") || ""),
      content: String(form.get("content") || ""),
      urgent: item.urgent,
      targetType: item.targetType,
      departmentId: item.departmentId ?? undefined,
      branchId: item.branchId ?? undefined,
      sectionId: item.sectionId ?? undefined,
      hostelId: item.hostelId ?? undefined,
      userEmail: item.userEmail ?? undefined,
      role: item.role ?? undefined,
      recipientType: item.recipientType,
      recipientTargets: item.recipientTargets ?? undefined,
      attachmentUrl: item.attachmentUrl ?? undefined,
      attachmentName: item.attachmentName ?? undefined,
    };
    await updateAnnouncement(item.id, payload);
    setEditing(null);
    await load();
  }

  async function saveEvent(item: EventItem, form: FormData) {
    const payload: EventPayload = {
      title: String(form.get("title") || ""),
      description: String(form.get("description") || ""),
      location: item.location,
      startAt: item.startAt,
      endAt: item.endAt,
      targetType: item.targetType,
      departmentId: item.departmentId ?? undefined,
      branchId: item.branchId ?? undefined,
      sectionId: item.sectionId ?? undefined,
      hostelId: item.hostelId ?? undefined,
      userEmail: item.userEmail ?? undefined,
      role: item.role ?? undefined,
      recipientType: item.recipientType,
      recipientTargets: item.recipientTargets ?? undefined,
      photoUrl: item.photoUrl ?? undefined,
      externalLink: item.externalLink ?? undefined,
      registrationEnabled: item.registrationEnabled,
      registrationDeadline: item.registrationDeadline ?? undefined,
    };
    await updateEvent(item.id, payload);
    setEditing(null);
    await load();
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-ink sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-light">Workspace</p>
            <h1 className="mt-2 text-3xl font-extrabold">My Posts</h1>
            <p className="mt-2 text-sm text-muted">Manage announcements and events you own.</p>
          </div>
          <a href="/dashboard" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-muted hover:text-ink">Back to dashboard</a>
        </div>
        {error && <p role="alert" className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        <section className="space-y-4">
          {announcements.map((item) => (
            <article key={`announcement-${item.id}`} className="rounded-2xl border border-white/10 bg-surface/80 p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-widest text-brand-light">Announcement</span><span className="text-xs text-muted">{item.status}</span></div>
              {editing === `announcement-${item.id}` ? (
                <form action={(form) => saveAnnouncement(item, form).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to save announcement."))} className="space-y-3">
                  <input name="title" defaultValue={item.title} className={inputClass} required maxLength={180} />
                  <textarea name="content" defaultValue={item.content} className={`${inputClass} min-h-28`} required maxLength={10000} />
                  <div className="flex gap-2"><button className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white" type="submit">Save</button><button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-muted" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
                </form>
              ) : <><h2 className="text-xl font-bold">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{item.content}</p><div className="mt-4 flex gap-2"><button className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-muted hover:text-ink" onClick={() => setEditing(`announcement-${item.id}`)}>Edit</button><button className="rounded-xl border border-red-400/30 px-3 py-2 text-sm font-bold text-red-200" onClick={() => remove("announcement", item.id)}>Delete</button></div></>}
            </article>
          ))}
          {events.map((item) => (
            <article key={`event-${item.id}`} className="rounded-2xl border border-white/10 bg-surface/80 p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-widest text-cyan">Event</span><span className="text-xs text-muted">{item.status}</span></div>
              {editing === `event-${item.id}` ? (
                <form action={(form) => saveEvent(item, form).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to save event."))} className="space-y-3">
                  <input name="title" defaultValue={item.title} className={inputClass} required maxLength={180} />
                  <textarea name="description" defaultValue={item.description} className={`${inputClass} min-h-28`} required maxLength={10000} />
                  <div className="flex gap-2"><button className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white" type="submit">Save</button><button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-muted" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
                </form>
              ) : <><h2 className="text-xl font-bold">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{item.description}</p><p className="mt-2 text-xs text-muted">{new Date(item.startAt).toLocaleString()} · {item.location}</p><div className="mt-4 flex gap-2"><button className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-muted hover:text-ink" onClick={() => setEditing(`event-${item.id}`)}>Edit</button><button className="rounded-xl border border-red-400/30 px-3 py-2 text-sm font-bold text-red-200" onClick={() => remove("event", item.id)}>Delete</button></div></>}
            </article>
          ))}
          {!announcements.length && !events.length && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-muted">No posts yet.</p>}
        </section>
      </div>
    </main>
  );
}
