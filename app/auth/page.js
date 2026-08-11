import Link from 'next/link';
import { authPortalCards } from '@/lib/authData';

export default function AuthPortal() {
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:px-8 lg:py-16">
      <section className="rounded-[28px] bg-white/95 p-10 shadow-soft ring-1 ring-slate-200">
        <div className="space-y-6">
          <div className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">Smart Campus Announcement Platform</div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">NotifyHub authentication experiences for every campus role.</h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">Frontend-only access flows for administrators, faculty, and students with a shared design system, clear role switching, and accessible validation behavior.</p>
          <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
            <span className="rounded-full bg-slate-100 px-4 py-2">Real-time announcements</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">Event updates</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">Urgent alerts</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {authPortalCards.map((card) => (
          <Link key={card.href} href={card.href} className={`rounded-3xl border p-8 text-left transition hover:-translate-y-1 hover:border-primary hover:shadow-soft ${card.type === 'register' ? 'bg-slate-50' : 'bg-white'}`}>
            <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">{card.role}</span>
            <h2 className="mt-6 text-2xl font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">{card.description}</p>
          </Link>
        ))}
        <div className="rounded-3xl border border-dashed bg-slate-50 p-8 text-left">
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">Privileged Access</span>
          <h2 className="mt-6 text-2xl font-semibold text-slate-900">Admin Accounts</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">Administrator access is managed internally. NotifyHub does not offer a public admin registration page.</p>
        </div>
      </section>
    </main>
  );
}
