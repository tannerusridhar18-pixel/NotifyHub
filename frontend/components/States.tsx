import { buttonClasses } from "@/components/ui/Button";

export function Loading({ label = "Loading NotifyHub…" }: { label?: string }) {
  return (
    <div className="grid place-items-center gap-4 py-20 text-center text-muted">
      <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white font-black shadow-glow animate-spin-slow text-xl">
        <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">◈</span>
      </div>
      <p className="text-sm font-bold tracking-wide text-ink/90">{label}</p>
    </div>
  );
}

// Skeleton card grid shown while feed data is loading — avoids a jarring blank page.
export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 backdrop-blur-xl shadow-soft"
        >
          <div className="animate-pulse">
            <div className="mb-4 h-4 w-28 rounded-full bg-white/[0.08]" />
            <div className="mb-3 h-6 w-4/5 rounded-lg bg-white/[0.08]" />
            <div className="mb-2 h-3.5 w-full rounded bg-white/[0.04]" />
            <div className="mb-4 h-3.5 w-3/4 rounded bg-white/[0.04]" />
            <div className="mt-6 pt-3.5 border-t border-white/[0.06] h-3 w-1/3 rounded bg-white/[0.06]" />
          </div>
          {/* Shimmer light sweep */}
          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
        </div>
      ))}
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/90 bg-gradient-to-br from-surface/70 to-surface-2/70 py-18 px-6 text-center text-muted backdrop-blur-xl">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-brand/40 bg-brand-50/90 text-2xl font-black text-brand-light shadow-glow">
        ＋
      </div>
      <h3 className="text-xl font-extrabold text-ink">No {label} yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted/90">
        There is nothing to display here right now. New campus signals will appear automatically once published.
      </p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[24px] border border-danger/40 bg-gradient-to-br from-[#240e17]/90 via-surface/95 to-surface-2/90 py-14 px-6 text-center text-[#fca5a5] shadow-lift backdrop-blur-2xl">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-danger/50 bg-danger-soft text-2xl font-black text-[#ff8ba0] shadow-[0_0_20px_rgba(244,63,94,0.35)]">
        !
      </div>
      <h3 className="text-xl font-extrabold text-white">Something needs attention</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#fca5a5]/90">{message}</p>
      {onRetry && (
        <button
          className={`${buttonClasses("secondary")} mt-6 !border-danger/40 !bg-surface-2/90 !text-white hover:!border-danger/70 hover:!bg-danger-soft/50`}
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}


