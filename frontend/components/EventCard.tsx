import type { EventItem } from "@/types";
import Countdown from "./Countdown";
export default function EventCard({ item }: { item: EventItem }) {
  const upcoming = true;
  return <article className="card event-card">
    <div className="event-date"><b>{new Date(item.startAt).toLocaleDateString(undefined,{day:"2-digit"})}</b><span>{new Date(item.startAt).toLocaleDateString(undefined,{month:"short"})}</span></div>
    <div className="event-main"><span className="eyebrow">{item.department}</span><h3>{item.title}</h3><p>{item.description}</p><div className="event-meta"><span>⌖ {item.venue}</span><span>◷ {new Date(item.startAt).toLocaleString()}</span></div>{upcoming && <div className="countdown-row">Starts in <Countdown target={item.startAt}/></div>}</div>
  </article>;
}
