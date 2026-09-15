"use client";
import { useEffect, useState } from "react";

export default function Countdown({ target }: { target: string }) {
  const [ms, setMs] = useState(() => Math.max(0, new Date(target).getTime() - Date.now()));

  useEffect(() => {
    const id = window.setInterval(() => setMs(Math.max(0, new Date(target).getTime() - Date.now())), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (ms === 0) return null;
  return (
    <div className="mt-3.5 inline-flex items-center gap-2.5 rounded-xl border border-teal-light/40 bg-gradient-to-r from-teal-soft/95 via-surface-2/90 to-teal-soft/95 px-3.5 py-1.5 text-xs font-bold text-teal-light shadow-[0_0_18px_rgba(45,212,191,0.2)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-teal-light/70">
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-light opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-light" />
      </span>
      <span className="text-[11px] font-bold text-muted/90 uppercase tracking-wider">Starts in</span>
      <span className="font-mono tracking-wider text-xs font-extrabold text-[#5eead4] drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">
        {days}d {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m{" "}
        <span className="inline-block transition-transform duration-200">{String(seconds).padStart(2, "0")}s</span>
      </span>
    </div>
  );
}


