import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const featureItems = [
  { icon: 'A', title: 'Real-Time Announcements', description: 'Help students and faculty receive important campus information quickly and clearly.' },
  { icon: 'E', title: 'Events', description: 'Keep campus events, workshops, and academic activities visible in one place.' },
  { icon: '!', title: 'Urgent Alerts', description: 'Highlight high-priority updates when the campus needs fast communication.' },
  { icon: 'S', title: 'Search & Filtering', description: 'Make it easier to find relevant announcements, departments, and information.' },
  { icon: 'D', title: 'Accessible Anywhere', description: 'Designed for smooth access across desktop, tablet, and mobile devices.' },
];

const steps = [
  { number: '01', title: 'Publish', description: 'Authorized Admin and Faculty users publish campus announcements and updates.' },
  { number: '02', title: 'Notify', description: 'Information becomes available through the centralized digital platform.' },
  { number: '03', title: 'Stay Informed', description: 'Students access announcements, events, and alerts directly from their devices.' },
];

const roleCards = [
  { role: 'Admin', description: 'Privileged access for platform management, publishing oversight, and secure administration.', links: [{ label: 'Admin Login', href: '/login/admin' }] },
  { role: 'Faculty', description: 'Faculty can sign in or create an account to communicate academic and event-related updates.', links: [{ label: 'Faculty Login', href: '/login/faculty' }, { label: 'Faculty Registration', href: '/register/faculty' }] },
  { role: 'Student', description: 'Students can quickly sign in or register to follow campus-wide updates from anywhere.', links: [{ label: 'Student Login', href: '/login/student' }, { label: 'Student Registration', href: '/register/student' }] },
];

export default function Home() {
  return (
    <div id="top">
      <Navbar />
      <main className="space-y-24 px-6 py-10 lg:px-8 lg:py-14">
        <section className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <p className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">Modern Campus Communication</p>
            <h1 className="max-w-2xl text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">Stay Connected. Stay Informed.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">NotifyHub brings campus announcements, events, and urgent alerts together in one smart digital platform built for students, faculty, and administrators.</p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a href="#announcements" className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5">Explore Announcements</a>
              <a href="/auth" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-primary transition hover:bg-slate-50">Get Started</a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-3xl bg-white/90 border border-slate-200 p-6 shadow-soft">
                <strong className="block text-xl font-semibold text-slate-900">3 Roles</strong>
                <span className="mt-2 block text-sm text-slate-600">Admin, Faculty, Student access flows</span>
              </article>
              <article className="rounded-3xl bg-white/90 border border-slate-200 p-6 shadow-soft">
                <strong className="block text-xl font-semibold text-slate-900">1 Platform</strong>
                <span className="mt-2 block text-sm text-slate-600">Centralized digital campus noticeboard</span>
              </article>
              <article className="rounded-3xl bg-white/90 border border-slate-200 p-6 shadow-soft">
                <strong className="block text-xl font-semibold text-slate-900">Any Device</strong>
                <span className="mt-2 block text-sm text-slate-600">Built for desktop, tablet, and mobile access</span>
              </article>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-soft">
              <div className="flex items-center gap-3 rounded-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Campus Feed
                <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Live</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Urgent Alert</p>
                  <strong className="mt-2 block text-base text-slate-900">Library block access shifts to Gate 2 after 6 PM today.</strong>
                  <span className="mt-4 inline-block text-sm font-semibold text-slate-500">Now</span>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Event Reminder</p>
                  <strong className="mt-2 block text-base text-slate-900">Innovation Club seminar starts at 2:00 PM in Auditorium A.</strong>
                  <span className="mt-4 inline-block text-sm font-semibold text-slate-500">2 PM</span>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Announcement</p>
                  <strong className="mt-2 block text-base text-slate-900">Mid-semester timetable updates are available for all departments.</strong>
                  <span className="mt-4 inline-block text-sm font-semibold text-slate-500">Today</span>
                </div>
              </div>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Search & filter by department</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-primary">
                  <span className="rounded-full bg-primary/10 px-3 py-2">Events</span>
                  <span className="rounded-full bg-primary/10 px-3 py-2">Alerts</span>
                  <span className="rounded-full bg-primary/10 px-3 py-2">Academics</span>
                </div>
              </div>
            </div>
            <div className="absolute left-0 top-[calc(100%+1rem)] hidden w-72 rounded-3xl bg-white/90 border border-slate-200 p-5 shadow-soft lg:block">
              <strong className="block text-base font-semibold text-slate-900">Faculty Posting</strong>
              <span className="mt-2 block text-sm leading-6 text-slate-600">Department notices and event updates</span>
            </div>
            <div className="absolute right-0 top-14 hidden w-72 rounded-3xl bg-white/90 border border-slate-200 p-5 shadow-soft lg:block">
              <strong className="block text-base font-semibold text-slate-900">Student Access</strong>
              <span className="mt-2 block text-sm leading-6 text-slate-600">Instant campus updates on the go</span>
            </div>
          </div>
        </section>

        <section id="announcements" className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">Core Features</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Everything Your Campus Needs to Stay Connected</h2>
            <p className="text-base leading-7 text-slate-600">NotifyHub replaces scattered notice boards with a clear, searchable, digital communication experience.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
            {featureItems.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-primary">{item.icon}</div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">How It Works</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">A simple flow for modern campus communication</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft">
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-2 text-sm font-bold text-primary">{item.number}</span>
                <h3 className="mt-6 text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">Role-Based Access</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Built for every campus communication role</h2>
            <p className="text-base leading-7 text-slate-600">NotifyHub keeps the experience consistent while giving each role a clear purpose.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {roleCards.map((card) => (
              <article key={card.role} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft">
                <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">{card.role}</span>
                <h3 className="mt-6 text-xl font-semibold text-slate-900">{card.role === 'Admin' ? 'Manage and control the NotifyHub platform.' : card.description}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
                <div className="mt-6 flex flex-col gap-3">
                  {card.links.map((link) => (
                    <a key={link.href} href={link.href} className="text-sm font-semibold text-primary hover:underline">
                      {link.label}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl rounded-[30px] border border-slate-200 bg-white/90 p-10 shadow-soft text-center">
          <p className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">Get Started</p>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Stay Connected With Your Campus</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">Access important announcements, events, and alerts through NotifyHub.</p>
          <a href="/auth" className="mt-8 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5">Get Started</a>
        </section>
      </main>
      <Footer />
    </div>
  );
}
