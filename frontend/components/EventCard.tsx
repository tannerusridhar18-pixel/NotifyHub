"use client";
import { useState } from "react";
import type { EventItem } from "@/types";
import Countdown from "./Countdown";
import { StatusBadge } from "@/components/ui/Badge";
import Spotlight from "@/components/ui/Spotlight";
import DetailModal from "@/components/ui/DetailModal";
import EventRegistrationPanel from "@/components/EventRegistrationPanel";

export default function EventCard({ item }: { item: EventItem }) {
  const [open, setOpen] = useState(false);
  const startDate = new Date(item.startAt);
  const dayStr = startDate.toLocaleDateString(undefined, { day: "2-digit" });
  const monthStr = startDate.toLocaleDateString(undefined, { month: "short" });

  return (
    <>
      <Spotlight
        as="article"
        tone="violet"
        className="nh-public-content-card group relative grid min-w-0 grid-cols-[76px_1fr] sm:grid-cols-[100px_1fr] gap-4 sm:gap-6 overflow-hidden rounded-[22px] border border-white/[0.09] bg-gradient-to-br from-[#15181c]/95 via-[#0d1013]/92 to-[#090b0d]/96 p-5 sm:p-6 cursor-pointer transition-[transform,opacity,border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:border-[#76d7ff]/35 hover:shadow-[0_18px_55px_rgba(118,215,255,.12)]"
      >
        {/* 3D Calendar date badge */}
        <div
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center rounded-2xl border border-[#76d7ff]/30 bg-gradient-to-b from-[#17231a] via-[#10171a] to-[#0b1012] p-3 text-center text-[#76d7ff] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_20px_-4px_rgba(147,51,234,0.35)] transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:-rotate-2 group-hover:border-brand-2/70 group-hover:shadow-[0_12px_28px_-4px_rgba(147,51,234,0.55)]"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-2-light">{monthStr}</span>
          <b className="font-display text-2xl sm:text-3xl font-extrabold leading-none text-white my-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{dayStr}</b>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted/90">EVENT</span>
        </div>

        <div className="min-w-0 flex flex-col justify-between" onClick={() => setOpen(true)}>
          <div>
            {item.photoUrl && <img src={item.photoUrl} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" />}
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-2/95 px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase text-muted transition-[transform,border-color] duration-200 ease-out group-hover:scale-105 group-hover:border-white/25">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-2 shadow-[0_0_8px_rgba(147,51,234,0.85)]" />
                {item.targetType}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <h3 className="mb-2 text-xl font-extrabold tracking-tight text-ink [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-brand-2-light">
              {item.title}
            </h3>
            <p className="text-[14px] leading-relaxed text-muted/95 [overflow-wrap:anywhere]">
              {item.description}
            </p>
            {item.externalLink && <a href={item.externalLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-brand-light underline">Open event link</a>}
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted/90">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2/90 px-3 py-1.5 border border-white/[0.06] transition-colors group-hover:border-white/20">
                <span className="text-cyan-light font-bold">⌖</span> {item.location}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2/90 px-3 py-1.5 border border-white/[0.06] transition-colors group-hover:border-white/20">
                <span className="text-brand-2-light font-bold">◷</span> {startDate.toLocaleString()}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-muted/80 group-hover:text-brand-2-light transition-colors">
                <span>View details</span>
                <span>→</span>
              </span>
            </div>
            {item.status === "PUBLISHED" && <Countdown target={item.startAt} />}
            {item.status === "PUBLISHED" && <EventRegistrationPanel event={item} />}
          </div>
        </div>

        {/* Hover bottom light accent — GPU accelerated scale-x */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-[#76d7ff] via-[#a78bfa] to-transparent transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
      </Spotlight>

      {open && <DetailModal item={{ type: "event", data: item }} onClose={() => setOpen(false)} />}
    </>
  );
}

