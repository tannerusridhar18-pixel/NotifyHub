import Link from 'next/link';

const footerLinks = [
  { label: 'Home', href: '#top' },
  { label: 'Announcements', href: '#announcements' },
  { label: 'Events', href: '#events' },
  { label: 'About', href: '#about' },
  { label: 'Login', href: '/auth' },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-slate-900">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-soft">NH</span>
            <div>
              <p className="font-semibold">NotifyHub</p>
              <p className="text-sm text-slate-500">Smart Campus Announcement Platform</p>
            </div>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">A centralized digital platform for campus announcements, events, and urgent alerts.</p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-primary">
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-sm text-slate-500">© 2026 NotifyHub. All rights reserved.</p>
      </div>
    </footer>
  );
}
