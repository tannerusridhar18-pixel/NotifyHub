"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Home"], ["/announcements", "Announcements"], ["/events", "Events"], ["/urgent", "Urgent"], ["/ask", "Ask Campus"],
];

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark">N</span><span>Notify<span>Hub</span></span></Link>
        <nav>{links.map(([href, label]) => <Link className={path === href ? "active" : ""} key={href} href={href}>{label}</Link>)}</nav>
        <Link href="/admin" className="admin-link">Admin portal ↗</Link>
      </header>
      <main>{children}</main>
      <footer><div><strong>NotifyHub</strong><span> · The campus signal, without the paper trail.</span></div><span>Built for 24/7 campus access.</span></footer>
    </>
  );
}
