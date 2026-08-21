'use client';

import { useState } from 'react';
import Link from 'next/link';
import BrandMark from './BrandMark';

const navItems = [
  { label: 'Home', href: '#top' },
  { label: 'Announcements', href: '#announcements' },
  { label: 'Events', href: '#events' },
  { label: 'About', href: '#about' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl transition-shadow duration-200 shadow-slate-900/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
        <BrandMark className="inline-flex items-center gap-4 text-slate-900" />

        <button
          type="button"
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 lg:hidden"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          <span className="sr-only">Toggle navigation</span>
          <div className="flex h-5 w-5 flex-col justify-between">
            <span className="block h-0.5 w-full rounded-full bg-slate-700" />
            <span className="block h-0.5 w-full rounded-full bg-slate-700" />
            <span className="block h-0.5 w-full rounded-full bg-slate-700" />
          </div>
        </button>

        <nav className={`absolute inset-x-0 top-full bg-white/95 px-6 pb-6 pt-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition-all duration-200 lg:static lg:block lg:max-w-none lg:flex lg:items-center lg:bg-transparent lg:p-0 lg:shadow-none ${menuOpen ? 'block' : 'hidden'}`}>
          <div className="grid gap-3 lg:flex lg:gap-4">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-primary">
                {item.label}
              </a>
            ))}
            <Link href="/auth" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/5 lg:ml-4">
              Get Started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
