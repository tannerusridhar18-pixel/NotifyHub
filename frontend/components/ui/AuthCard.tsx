import Spotlight from "./Spotlight";

export default function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <Spotlight className="relative w-full max-w-[455px] overflow-hidden rounded-[22px] border border-border bg-surface p-7 shadow-lift transition-shadow duration-300 hover:shadow-glow after:absolute after:inset-x-0 after:top-0 after:z-10 after:h-1 after:bg-gradient-to-r after:from-brand after:via-brand-2 after:to-[#6be2ff] sm:p-8">
      {children}
    </Spotlight>
  );
}
