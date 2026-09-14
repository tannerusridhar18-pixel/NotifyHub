import { buttonClasses } from "@/components/ui/Button";

export function Loading({ label = "Loading NotifyHub…" }: { label?: string }) {
  return (
    <div className="grid place-items-center gap-3 py-16 text-center text-muted">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 font-extrabold text-brand animate-spin-slow">N</div>
      <p>{label}</p>
    </div>
  );
}

// Skeleton card grid shown while feed data is loading — avoids a jarring blank page.
export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border bg-surface p-6">
          <div className="mb-4 h-3 w-24 rounded bg-surface-2" />
          <div className="mb-2 h-5 w-3/4 rounded bg-surface-2" />
          <div className="mb-1.5 h-3 w-full rounded bg-white/[0.04]" />
          <div className="h-3 w-5/6 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 py-16 text-center text-muted">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 font-extrabold text-brand">＋</div>
      <h3 className="text-ink">No {label} yet</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm">There is nothing to show here right now. New items will appear automatically when they are published.</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-danger-soft bg-danger-soft/40 py-16 text-center text-[#ffb4ac]">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-danger-soft font-extrabold">!</div>
      <h3>Something needs attention</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm">{message}</p>
      {onRetry && (
        <button className={`${buttonClasses("secondary")} mt-4`} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
