"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/api";

export default function Register(){
 const router=useRouter();const [form,setForm]=useState({invitationToken:"",password:"",confirmPassword:""});const [error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
 const set=(k:keyof typeof form,v:string)=>setForm({...form,[k]:v});
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");try{await registerUser(form);setSuccess("Registration complete. You can now sign in.");setTimeout(()=>router.push("/auth/login"),700)}catch(e){setError(e instanceof Error?e.message:"Registration failed.")}finally{setBusy(false)}}
 return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}><span className="kicker">Join the campus signal</span><h2>Create account.</h2><p className="muted">Register as a student or faculty member. Your backend remains the authority for validation and role assignment.</p>
 <div className="field"><label htmlFor="invitationToken">Invitation token</label><input id="invitationToken" required type="text" className="input" value={form.invitationToken} onChange={e=>set("invitationToken",e.target.value)}/></div>
 <div className="field"><label htmlFor="password">Password</label><input id="password" required minLength={8} type="password" className="input" value={form.password} onChange={e=>set("password",e.target.value)}/></div>
 <div className="field"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" required minLength={8} type="password" className="input" value={form.confirmPassword} onChange={e=>set("confirmPassword",e.target.value)}/></div>
 {error&&<div className="form-error">{error}</div>}{success&&<div className="success-box">{success}</div>}<button className="button" disabled={busy}>{busy?"Creating…":"Create account"}</button>
 <p className="muted auth-switch">Already registered? <Link href="/auth/login">Sign in</Link></p>
 </form></div>
}
