import type { EventItem } from "@/types";
import Countdown from "./Countdown";
import { StatusBadge } from "@/components/ui/Badge";
import Spotlight from "@/components/ui/Spotlight";

export default function EventCard({ item }: { item: EventItem }) {
  return (
    <Spotlight
      as="article"
      className="group grid min-w-0 grid-cols-[64px_1fr] gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card sm:grid-cols-[84px_1fr] sm:gap-6"
    >
      <div className="grid h-16 place-content-center place-items-center rounded-2xl bg-brand-50 text-brand transition-transform duration-300 group-hover:scale-105 sm:h-[84px]">
        <b className="font-display text-xl leading-none sm:text-3xl">{new Date(item.startAt).toLocaleDateString(undefined, { day: "2-digit" })}</b>
        <span className="text-[10px] font-extrabold uppercase">{new Date(item.startAt).toLocaleDateString(undefined, { month: "short" })}</span>
      </div>
      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-brand">{item.targetType}</span>
          <StatusBadge status={item.status} />
        </div>
        <h3 className="mb-1.5 text-xl font-semibold tracking-tight [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-brand">{item.title}</h3>
        <p className="text-[15px] leading-relaxed text-muted [overflow-wrap:anywhere]">{item.description}</p>
        <div className="mt-3.5 flex flex-wrap gap-4 text-xs text-muted">
          <span>⌖ {item.location}</span>
          <span>◷ {new Date(item.startAt).toLocaleString()}</span>
        </div>
        {item.status === "PUBLISHED" && <Countdown target={item.startAt} />}
      </div>
    </Spotlight>
  );
}
