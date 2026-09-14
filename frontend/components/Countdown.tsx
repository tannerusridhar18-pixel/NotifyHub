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
    <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-xs font-bold text-success">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      Starts in{" "}
      <span className="tabular-nums">
        {days}d {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
      </span>
    </div>
  );
}
