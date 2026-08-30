import type { Announcement } from "@/types";
export default function AnnouncementCard({ item }: { item: Announcement }) {
  return <article className={`card announcement-card ${item.urgent ? "urgent-card" : ""}`}>
    <div className="card-top"><span className="eyebrow">{item.category}</span>{item.urgent && <span className="urgent-pill">URGENT</span>}</div>
    <h3>{item.title}</h3>
    <p className="muted">{item.department} · {new Date(item.publishedAt).toLocaleDateString()}</p>
    <p className="clamp">{item.content}</p>
  </article>;
}
