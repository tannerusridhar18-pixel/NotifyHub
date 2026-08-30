"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";

export default function UserLogin(){
 const router=useRouter();const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[role,setRole]=useState<"STUDENT"|"FACULTY">("STUDENT"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const x=await login(email,password);if(x.role&&x.role.toUpperCase()!==role){throw new Error(`This account is not registered as ${role.toLowerCase()}.`)}localStorage.setItem("notifyhub_access_token",x.accessToken);localStorage.setItem("notifyhub_refresh_token",x.refreshToken);localStorage.setItem("notifyhub_username",x.username);localStorage.setItem("notifyhub_role",x.role);router.push("/")}catch(e){setError(e instanceof Error?e.message:"Login failed.")}finally{setBusy(false)}}
 return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}><span className="kicker">Campus identity</span><h2>Welcome back.</h2><p className="muted">Sign in with your registered campus email and password.</p>
 <div className="role-switch"><button type="button" className={role==="STUDENT"?"selected":""} onClick={()=>setRole("STUDENT")}>Student</button><button type="button" className={role==="FACULTY"?"selected":""} onClick={()=>setRole("FACULTY")}>Faculty</button></div>
 <div className="field"><label htmlFor="email">Email</label><input id="email" required type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)}/></div>
 <div className="field"><label htmlFor="password">Password</label><input id="password" required type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)}/></div>
 {error&&<div className="form-error">{error}</div>}<button className="button" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
 <p className="muted auth-switch">New to NotifyHub? <Link href="/auth/register">Create a student/faculty account</Link></p><p className="muted auth-switch"><Link href="/admin">Admin portal</Link></p>
 </form></div>
}
