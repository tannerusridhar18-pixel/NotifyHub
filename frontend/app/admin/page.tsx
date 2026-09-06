"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";

export default function AdminLogin(){
 const router=useRouter(); const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const x=await login(email,password);if(x.role!=="ADMIN")throw new Error("Access denied.");router.push("/admin/dashboard")}catch(e){setError(e instanceof Error?e.message:"Login failed.")}finally{setBusy(false)}}
 return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}>
  <span className="kicker">Restricted area</span><h2>Admin portal</h2><p className="muted">Use the admin email and password configured by the NotifyHub backend.</p>
  <div className="field"><label htmlFor="email">Admin email</label><input id="email" required type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)}/></div>
  <div className="field"><label htmlFor="password">Password</label><input id="password" required type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)}/></div>
  {error&&<div className="form-error">{error}</div>}<button className="button" disabled={busy}>{busy?"Signing in…":"Sign in as admin"}</button>
  <p className="muted auth-switch">Student or faculty? <Link href="/auth/login">Sign in here</Link></p>
 </form></div>
}
