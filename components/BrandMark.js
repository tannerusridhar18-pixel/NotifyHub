import Link from 'next/link';

export default function BrandMark({ className = 'inline-flex items-center gap-4 text-slate-900', showText = true }) {
  return (
    <Link href="/" className={className} aria-label="NotifyHub home">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-inner shadow-slate-500/10">
        <span className="relative inline-block h-4 w-4 rounded-[10px] bg-primary">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-primary/90 bg-slate-50" />
        </span>
      </span>
      {showText ? (
        <span>
          <strong className="block text-lg font-black tracking-tight">NotifyHub</strong>
          <small className="block text-sm font-medium text-slate-500">Smart Campus Announcement Platform</small>
        </span>
      ) : null}
    </Link>
  );
}
