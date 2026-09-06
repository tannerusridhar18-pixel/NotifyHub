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
  return <div className="countdown-row">Starts in <span className="countdown">{days}d {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s</span></div>;
}
