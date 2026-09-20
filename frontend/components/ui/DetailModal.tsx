"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Announcement, CampusQuery, EventItem } from "@/types";
import { StatusBadge, UrgentBadge } from "@/components/ui/Badge";
import Countdown from "@/components/Countdown";
import EventRegistrationPanel from "@/components/EventRegistrationPanel";
import { buttonClasses } from "@/components/ui/Button";

export type ModalItem =
  | { type: "announcement"; data: Announcement }
  | { type: "event"; data: EventItem }
  | { type: "query"; data: CampusQuery };

export default function DetailModal({
  item,
  onClose,
}: {
  item: ModalItem | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!item) return;

    // Lock body scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [item, onClose]);

  if (!mounted || !item) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Dimmed backdrop overlay covering whole viewport */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Card */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-[24px] border border-white/15 bg-gradient-to-b from-surface via-surface-2 to-surface p-6 sm:p-8 shadow-2xl text-ink animate-toast-in scroll-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white shadow-glow">
              ◈
            </span>
            <span className="text-xs font-extrabold tracking-widest uppercase text-muted">
              {item.type === "announcement"
                ? "Campus Announcement Details"
                : item.type === "event"
                ? "Academic Event Details"
                : "Campus Inquiry Details"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-surface-2 text-muted hover:text-white hover:border-white/20 transition-all active:scale-95"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-6">
          {item.type === "announcement" && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-2 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-light shadow-[0_0_8px_rgba(124,58,237,0.85)]" />
                  Target: {item.data.targetType === "GLOBAL" ? "Everyone" : item.data.targetType}
                </span>
                {item.data.urgent && <UrgentBadge />}
                <StatusBadge status={item.data.status} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
                {item.data.title}
              </h2>
              <p className="text-xs font-semibold text-muted mb-6">
                Published on{" "}
                {item.data.publishedAt
                  ? new Date(item.data.publishedAt).toLocaleString(undefined, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })
                  : "Recently"}
              </p>

              <div className="rounded-2xl border border-white/[0.08] bg-surface-2/80 p-5 sm:p-6 text-sm sm:text-base leading-relaxed text-muted/95 whitespace-pre-wrap">
                {item.data.content}
              </div>

              {item.data.attachmentUrl && (
                <div className="mt-4 rounded-2xl border border-brand/30 bg-brand-50/50 p-4 backdrop-blur-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brand/20 text-brand-light font-bold text-lg">
                      📎
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.data.attachmentName || "Official Attachment / Document"}</p>
                      <p className="text-[10px] text-muted truncate">{item.data.attachmentUrl}</p>
                    </div>
                  </div>
                  <a
                    href={item.data.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-xs font-bold text-white hover:opacity-90 shadow-glow transition-all"
                  >
                    Open / Download ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {item.type === "event" && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-2 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-2 shadow-[0_0_8px_rgba(147,51,234,0.85)]" />
                  Target: {item.data.targetType}
                </span>
                <StatusBadge status={item.data.status} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
                {item.data.title}
              </h2>
              {item.data.photoUrl && <img src={item.data.photoUrl} alt="" className="mb-5 h-48 w-full rounded-2xl object-cover" />}

              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.08] bg-surface-2 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Schedule</span>
                  <strong className="text-sm font-bold text-white mt-1 block">
                    {new Date(item.data.startAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {" — "}
                    {new Date(item.data.endAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                  </strong>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-surface-2 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Location</span>
                  <strong className="text-sm font-bold text-cyan-light mt-1 flex items-center gap-1.5">
                    <span>⌖</span> {item.data.location}
                  </strong>
                </div>
              </div>

              {item.data.status === "PUBLISHED" && (
                <div className="mb-6">
                  <Countdown target={item.data.startAt} />
                </div>
              )}

              <div className="rounded-2xl border border-white/[0.08] bg-surface-2/80 p-5 sm:p-6 text-sm sm:text-base leading-relaxed text-muted/95 whitespace-pre-wrap">
                {item.data.description}
              </div>
              {item.data.externalLink && <a href={item.data.externalLink} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-brand-light underline">Open event link</a>}
              <EventRegistrationPanel event={item.data} />
            </div>
          )}

          {item.type === "query" && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-2 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-light">
                  Department: {item.data.department}
                </span>
                <StatusBadge status={item.data.status} />
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
                {item.data.subject}
              </h2>

              <p className="text-xs font-semibold text-muted mb-5">
                Submitted by <strong className="text-ink">{item.data.name}</strong> ({item.data.email}) · {new Date(item.data.createdAt).toLocaleString()}
              </p>

              <div className="rounded-2xl border border-white/[0.08] bg-surface-2/80 p-5 text-sm leading-relaxed text-muted/95 whitespace-pre-wrap">
                {item.data.message}
              </div>

              {item.data.adminResponse && (
                <div className="mt-5 rounded-2xl border border-success/40 bg-success-soft/90 p-5 text-sm text-[#8ff0c8]">
                  <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-[#6ee7b7]">
                    Official Campus Administration Response
                  </span>
                  <p className="leading-relaxed whitespace-pre-wrap">{item.data.adminResponse}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-white/[0.08] flex justify-end">
          <button onClick={onClose} className={buttonClasses("secondary", "!px-6 !py-2.5 !text-xs")}>
            Close details
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
