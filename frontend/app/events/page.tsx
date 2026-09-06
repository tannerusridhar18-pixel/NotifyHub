"use client";
import { useEffect, useState } from "react";
import { events } from "@/lib/api";
import type { EventItem } from "@/types";
import EventCard from "@/components/EventCard";
import { Empty, ErrorState, Loading } from "@/components/States";

export default function EventsPage(){
 const [items,setItems]=useState<EventItem[]>([]),[department,setDepartment]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=(nextDepartment=department)=>{setLoading(true);setError("");events({size:20,upcoming:true,department:nextDepartment}).then(x=>setItems(x.content)).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
 useEffect(()=>{void events({size:20,upcoming:true}).then(x=>setItems(x.content)).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 return <section className="page"><span className="kicker">Campus calendar</span><h1>Events</h1><p className="lead">See what’s next, where it is, and exactly how long until it starts.</p>
 <div className="toolbar"><select className="select" style={{maxWidth:300}} value={department} onChange={e=>{setDepartment(e.target.value);setTimeout(load,0)}}><option value="">All departments</option><option>Computer Science</option><option>Mechanical</option><option>Electrical</option><option>Civil</option><option>Administration</option></select></div>
 {loading?<Loading/>:error?<ErrorState message={error}/>:items.length?<div className="grid">{items.map(x=><EventCard key={x.id} item={x}/>)}</div>:<Empty label="upcoming events"/>}</section>
}
