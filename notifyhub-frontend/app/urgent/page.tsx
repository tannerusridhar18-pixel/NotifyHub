"use client";
import { useEffect,useState } from "react";
import { urgentAnnouncements } from "@/lib/api";
import type { Announcement } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import { Empty, ErrorState, Loading } from "@/components/States";

export default function UrgentPage(){const [items,setItems]=useState<Announcement[]>([]),[error,setError]=useState("");useEffect(()=>{urgentAnnouncements(0,50).then(x=>setItems(x.content)).catch(e=>setError(e.message))},[]);return <section className="page"><span className="kicker">Priority channel</span><h1>Urgent alerts</h1><p className="lead">Time-sensitive notices are separated here so they don’t disappear into the ordinary feed.</p>{error?<ErrorState message={error}/>:items.length?<div className="grid grid-2">{items.map(x=><AnnouncementCard key={x.id} item={x}/>)}</div>:<Loading/>}{!error&&!items.length&&<Empty label="urgent alerts"/>}</section>}
