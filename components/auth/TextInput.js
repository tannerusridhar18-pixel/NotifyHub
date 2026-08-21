'use client';

export default function TextInput({ label, name, type = 'text', value, onChange, placeholder, autoComplete, error, required, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <div className="relative">
        {type === 'select' ? (
          <select
            name={name}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            required={required}
            className={`w-full rounded-2xl border p-4 text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 ${error ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white'}`}
          >
            {children}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            required={required}
            className={`w-full rounded-2xl border p-4 text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 ${error ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white'}`}
          />
        )}
      </div>
      <p className="min-h-[1.25rem] text-sm text-rose-600">{error}</p>
    </label>
  );
}
