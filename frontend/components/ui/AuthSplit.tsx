import Link from "next/link";
import { cx } from "./classes";

export default function AuthSplit({
  tone = "brand",
  kicker,
  title,
  description,
  metrics,
  orbitLabels,
  children,
}: {
  tone?: "brand" | "admin";
  kicker: string;
  title: React.ReactNode;
  description: string;
  metrics: { value: string; label: string }[];
  orbitLabels?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-74px)] bg-bg lg:min-h-[calc(100vh-82px)] lg:grid-cols-[1.1fr_0.9fr]">
      <section
        className={cx(
          "relative flex min-h-[440px] flex-col justify-between overflow-hidden border-b border-border/90 px-6 py-10 sm:px-[6vw] sm:py-14 lg:min-h-0 lg:border-b-0 lg:border-r",
          tone === "admin"
            ? "bg-[radial-gradient(circle_at_75%_20%,rgba(16,185,129,0.18),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.12),transparent_45%),linear-gradient(160deg,#040609_0%,#07140e_60%,#0c1f17_100%)]"
            : "bg-[radial-gradient(circle_at_75%_20%,rgba(168,85,247,0.18),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.15),transparent_45%),linear-gradient(160deg,#060813_0%,#0d112b_50%,#131945_100%)]"
        )}
      >
        <div className="relative z-10">
          <Link href="/" className="group inline-flex items-center gap-3 font-display text-xl font-bold tracking-tight text-ink">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white shadow-glow transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-glow-violet">
              ◈
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              Notify<span className={tone === "admin" ? "text-success-light" : "text-brand-light"}>Hub</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 my-auto max-w-[620px] py-12 lg:py-0">
          <span
            className={cx(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-extrabold tracking-[0.14em] uppercase backdrop-blur-xl shadow-sm",
              tone === "admin"
                ? "border border-success/40 bg-success-soft/90 text-[#6ee7b7]"
                : "border border-brand/40 bg-brand-50/90 text-brand-light shadow-[0_0_15px_rgba(99,102,241,0.25)]"
            )}
          >
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            {kicker}
          </span>
          <h1 className="my-5 text-[44px] leading-[1.03] tracking-tight font-extrabold sm:text-6xl lg:text-[70px]">{title}</h1>
          <p className="max-w-[560px] text-base leading-relaxed text-muted/95 sm:text-lg font-normal">{description}</p>
          <div className="mt-8 flex flex-wrap gap-4 sm:gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-2xl border border-white/12 bg-white/[0.04] px-4.5 py-3 backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:border-white/25">
                <b className="font-display text-xl sm:text-2xl font-extrabold text-ink">{m.value}</b>
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted/80 mt-0.5">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {orbitLabels && (
          <div className="pointer-events-none absolute -right-[70px] bottom-10 hidden h-[360px] w-[360px] rotate-[-12deg] place-items-center rounded-full border border-white/[0.08] lg:grid">
            <div className="absolute inset-[35px] rounded-full border border-dashed border-white/[0.08]" />
            <div className="absolute inset-[75px] rounded-full border border-white/[0.06]" />
            {orbitLabels.map((l, i) => (
              <span
                key={l}
                className={cx(
                  "absolute rounded-full border border-white/15 bg-surface/90 px-3 py-1 text-[9px] font-extrabold tracking-[0.14em] text-muted shadow-card backdrop-blur-xl",
                  i === 0 && "left-[110px] top-[14px]",
                  i === 1 && "bottom-[100px] right-[18px]",
                  i === 2 && "bottom-[80px] left-[24px]"
                )}
              >
                {l}
              </span>
            ))}
          </div>
        )}

        <div className="relative z-10 text-xs font-semibold text-muted/80">
          <span>Enterprise grade · Instant synchronization · Role isolated</span>
        </div>
      </section>
      <section className="relative grid place-items-center bg-bg/85 px-5 py-12 sm:px-[6vw]">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="relative z-10 w-full flex justify-center">{children}</div>
      </section>
    </div>
  );
}
