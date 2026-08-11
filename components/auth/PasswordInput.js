'use client';

import { useState } from 'react';

export default function PasswordInput({ label, name, value, onChange, placeholder, autoComplete, error, required }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-2xl border p-4 pr-28 text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 ${error ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white'}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-slate-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <p className="min-h-[1.25rem] text-sm text-rose-600">{error}</p>
    </label>
  );
}
