'use client';

import Link from 'next/link';

const loginPaths = {
  admin: '/login/admin',
  faculty: '/login/faculty',
  student: '/login/student',
};

const registerPaths = {
  faculty: '/register/faculty',
  student: '/register/student',
};

export default function RoleSwitcher({ activeRole, mode }) {
  const isRegister = mode === 'register';
  const links = [
    { role: 'admin', href: '/login/admin', label: 'Admin' },
    { role: 'faculty', href: isRegister ? '/register/faculty' : '/login/faculty', label: 'Faculty' },
    { role: 'student', href: isRegister ? '/register/student' : '/login/student', label: 'Student' },
  ];

  return (
    <nav aria-label="Switch role" className="inline-flex flex-wrap gap-3 rounded-full border border-slate-200 bg-white/80 p-2">
      {links.map((item) => (
        <Link
          key={item.role}
          href={item.href}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${item.role === activeRole ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-primary'}`}
          aria-current={item.role === activeRole ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
