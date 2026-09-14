"use client";
import { useEffect, useRef, useState } from "react";

export default function Counter({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number | null>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing a ref-driven animation value, not derived render state
      setDisplay(value);
      prevValue.current = value;
      return;
    }
    const from = prevValue.current;
    const delta = value - from;
    let start: number | null = null;
    function step(ts: number) {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + delta * eased));
      if (progress < 1) frame.current = requestAnimationFrame(step);
      else prevValue.current = value;
    }
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, duration]);

  return <>{display}</>;
}
