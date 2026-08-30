"use client";
import { useEffect, useState } from "react";
import { announcements } from "@/lib/api";
import type { Announcement } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import { Empty, ErrorState, Loading } from "@/components/States";

const departments=["All departments","Computer Science","Mechanical","Electrical","Civil","Administration"];
const categories=["All categories","Academic","Examination","Placement","Club","General"];

export default function AnnouncementsPage(){
 const [items,setItems]=useState<Announcement[]>([]),[q,setQ]=useState(""),[category,setCategory]=useState(""),[department,setDepartment]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=()=>{setLoading(true);setError("");announcements({q,category,department}).then(x=>setItems(x.content)).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
 useEffect(()=>{load()},[]);
 return <section className="page"><span className="kicker">The public feed</span><h1>Announcements</h1><p className="lead">Search the campus signal by topic, category or department.</p>
 <div className="toolbar"><input className="input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} placeholder="Search titles and content…"/><select className="select" value={category} onChange={e=>{setCategory(e.target.value);setTimeout(load,0)}}><option value="">All categories</option>{categories.slice(1).map(x=><option key={x}>{x}</option>)}</select><select className="select" value={department} onChange={e=>{setDepartment(e.target.value);setTimeout(load,0)}}><option value="">All departments</option>{departments.slice(1).map(x=><option key={x}>{x}</option>)}</select><button className="button" onClick={load}>Search</button></div>
 {loading?<Loading/>:error?<ErrorState message={error}/>:items.length?<div className="grid grid-3">{items.map(x=><AnnouncementCard key={x.id} item={x}/>)}</div>:<Empty label="announcements"/>}</section>
}
