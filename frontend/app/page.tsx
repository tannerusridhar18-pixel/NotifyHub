"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { announcements, events, urgentAnnouncements } from "@/lib/api";
import type { Announcement, EventItem } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import EventCard from "@/components/EventCard";
import { Loading, ErrorState } from "@/components/States";

export default function Home() {
  const [items,setItems]=useState<Announcement[]>([]);
  const [upcoming,setUpcoming]=useState<EventItem[]>([]);
  const [urgent,setUrgent]=useState<Announcement[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{Promise.all([announcements({size:3}),events({size:2,upcoming:true}),urgentAnnouncements(0,2)]).then(([a,e,u])=>{setItems(a.content);setUpcoming(e.content);setUrgent(u.content)}).catch(e=>setError(e.message));},[]);
  return <div>
    <section className="page hero">
      <div><span className="kicker">Smart campus signal</span><h1>Know what’s happening.<br/><em>Before it’s missed.</em></h1><p className="lead">NotifyHub replaces the hallway notice board with one living campus feed for announcements, events, urgent alerts and questions.</p><div className="toolbar"><Link className="button" href="/announcements">Browse announcements</Link><Link className="button secondary" href="/ask">Ask the campus</Link></div></div>
      <div className="hero-art"><span className="kicker" style={{color:"#ffad9d"}}>LIVE CAMPUS BOARD</span><div className="signal-card"><div className="eyebrow">Today’s signal</div><h3>One place. Every important update.</h3><div className="signal-line"/><div className="signal-line short"/><div className="signal-line"/><p className="muted">24/7 access · Searchable · Mobile-ready</p></div></div>
    </section>
    <section className="page" style={{paddingTop:10}}>
      {error ? <ErrorState message={error}/> : <>{urgent.length>0&&<><div className="section-head"><div><span className="kicker">Attention now</span><h2>Urgent signals</h2></div><Link href="/urgent" className="button secondary">View all</Link></div><div className="grid grid-2">{urgent.map(x=><AnnouncementCard key={x.id} item={x}/>)}</div></>}
      <div className="section-head" style={{marginTop:70}}><div><span className="kicker">Latest</span><h2>Campus announcements</h2></div><Link href="/announcements" className="button secondary">Open feed</Link></div>
      {items.length?<div className="grid grid-3">{items.map(x=><AnnouncementCard key={x.id} item={x}/>)}</div>:<Loading/>}
      <div className="section-head" style={{marginTop:70}}><div><span className="kicker">On the calendar</span><h2>Upcoming events</h2></div><Link href="/events" className="button secondary">See events</Link></div>
      {upcoming.length?<div className="grid">{upcoming.map(x=><EventCard key={x.id} item={x}/>)}</div>:<Loading/>}</>}
    </section>
  </div>;
}
