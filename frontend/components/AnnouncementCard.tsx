import type { Announcement } from "@/types";
import { cx } from "@/components/ui/classes";
import { StatusBadge, UrgentBadge } from "@/components/ui/Badge";
import Spotlight from "@/components/ui/Spotlight";

const targetLabel = (x: Announcement) => (x.targetType === "GLOBAL" ? "Everyone" : x.targetType.toLowerCase());

export default function AnnouncementCard({ item }: { item: Announcement }) {
  return (
    <Spotlight
      as="article"
      className={cx(
        "group min-w-0 rounded-2xl border p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card",
        item.urgent ? "border-danger-soft bg-gradient-to-br from-surface to-[#20141a]" : "border-border bg-surface"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold text-brand">
          {item.status} · {targetLabel(item)}
        </span>
        {item.urgent && <UrgentBadge />}
      </div>
      <h3 className="mb-1.5 text-xl font-semibold tracking-tight [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-brand">{item.title}</h3>
      <p className="mb-2 text-sm text-muted">Published {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "not yet"}</p>
      <p className="line-clamp-4 text-[15px] leading-relaxed text-muted [overflow-wrap:anywhere]">{item.content}</p>
      {item.status !== "PUBLISHED" && (
        <div className="mt-4">
          <StatusBadge status={item.status} />
        </div>
      )}
      <div className="mt-4 h-px w-0 bg-gradient-to-r from-brand to-brand-2 transition-all duration-500 group-hover:w-full" />
    </Spotlight>
  );
}
