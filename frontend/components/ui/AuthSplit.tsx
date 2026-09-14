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
    <div className="grid min-h-[calc(100vh-70px)] bg-bg lg:min-h-[calc(100vh-78px)] lg:grid-cols-[1.08fr_0.92fr]">
      <section
        className={cx(
          "relative flex min-h-[420px] flex-col overflow-hidden border-b border-border px-6 py-9 text-ink sm:px-[7vw] sm:py-14 lg:min-h-0 lg:border-b-0 lg:border-r",
          tone === "admin"
            ? "bg-[radial-gradient(circle_at_72%_18%,rgba(61,220,155,0.16),transparent_28%),linear-gradient(160deg,#05070a,#0c1712_60%,#0f1d18)]"
            : "bg-[radial-gradient(circle_at_78%_22%,rgba(185,140,255,0.22),transparent_30%),linear-gradient(160deg,#05060b_0%,#0e0f1c_55%,#151a30_100%)]"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-semibold text-ink">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-ink text-bg shadow-[3px_3px_0_var(--color-brand-2)]">◈</span>
          <span>
            Notify<span>Hub</span>
          </span>
        </Link>
        <div className="my-auto max-w-[620px] pt-16 lg:pt-0">
          <span className="text-[11px] font-bold text-brand-2">{kicker}</span>
          <h1 className="my-4 text-[40px] leading-[1.05] sm:text-6xl lg:text-[72px]">{title}</h1>
          <p className="max-w-[590px] text-[15px] leading-relaxed text-muted sm:text-[17px]">{description}</p>
          <div className="mt-8 flex flex-wrap gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="grid gap-1">
                <b className="font-display text-lg">{m.value}</b>
                <span className="text-[10px] uppercase tracking-[0.1em] text-muted">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
        {orbitLabels && (
          <div className="absolute -right-[70px] bottom-16 hidden h-[290px] w-[290px] rotate-[-14deg] place-items-center rounded-full border border-white/[0.13] lg:grid">
            <div className="absolute inset-[34px] rounded-full border border-white/10" />
            <div className="absolute inset-[72px] rounded-full border border-white/10" />
            {orbitLabels.map((l, i) => (
              <span
                key={l}
                className={cx(
                  "absolute text-[9px] font-extrabold tracking-[0.13em] text-muted",
                  i === 0 && "left-[90px] top-[15px]",
                  i === 1 && "bottom-[85px] right-[22px]",
                  i === 2 && "bottom-[70px] left-[28px]"
                )}
              >
                {l}
              </span>
            ))}
          </div>
        )}
      </section>
      <section className="grid place-items-center bg-bg px-5 py-10 sm:px-[6vw]">{children}</section>
    </div>
  );
}
