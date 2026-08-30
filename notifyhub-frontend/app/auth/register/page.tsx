"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/api";

export default function Register(){
 const router=useRouter();const [role,setRole]=useState<"STUDENT"|"FACULTY">("STUDENT");const [form,setForm]=useState({name:"",email:"",password:"",department:""});const [error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
 const set=(k:keyof typeof form,v:string)=>setForm({...form,[k]:v});
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");try{await registerUser({...form,role});setSuccess("Registration successful. You can now sign in.");setTimeout(()=>router.push("/auth/login"),700)}catch(e){setError(e instanceof Error?e.message:"Registration failed.")}finally{setBusy(false)}}
 return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}><span className="kicker">Join the campus signal</span><h2>Create account.</h2><p className="muted">Register as a student or faculty member. Your backend remains the authority for validation and role assignment.</p>
 <div className="role-switch"><button type="button" className={role==="STUDENT"?"selected":""} onClick={()=>setRole("STUDENT")}>Student</button><button type="button" className={role==="FACULTY"?"selected":""} onClick={()=>setRole("FACULTY")}>Faculty</button></div>
 {(["name","email","department"] as const).map(k=><div className="field" key={k}><label htmlFor={k}>{k==="name"?"Full name":k[0].toUpperCase()+k.slice(1)}</label><input id={k} required type={k==="email"?"email":"text"} className="input" value={form[k]} onChange={e=>set(k,e.target.value)}/></div>)}
 <div className="field"><label htmlFor="password">Password</label><input id="password" required minLength={8} type="password" className="input" value={form.password} onChange={e=>set("password",e.target.value)}/></div>
 {error&&<div className="form-error">{error}</div>}{success&&<div className="success-box">{success}</div>}<button className="button" disabled={busy}>{busy?"Creating…":"Create account"}</button>
 <p className="muted auth-switch">Already registered? <Link href="/auth/login">Sign in</Link></p>
 </form></div>
}
