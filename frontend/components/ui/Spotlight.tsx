"use client";
import React, { useRef, useState, useEffect } from "react";
import { cx } from "./classes";

export default function Spotlight({
  children,
  className,
  tone = "brand",
  as: Tag = "div",
  enable3d = true,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "brand" | "violet" | "cyan" | "danger" | "amber" | "white";
  as?: "div" | "article" | "section";
  enable3d?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const rafRef = useRef<number | null>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || reducedMotion) return;
    const el = ref.current;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty("--spot-x", `${x}px`);
      el.style.setProperty("--spot-y", `${y}px`);

      if (enable3d) {
        const w = el.offsetWidth || 300;
        const h = el.offsetHeight || 200;
        const rotateX = ((y - h / 2) / (h / 2)) * -3.5;
        const rotateY = ((x - w / 2) / (w / 2)) * 3.5;
        el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(1)}deg) rotateY(${rotateY.toFixed(1)}deg) translate3d(0, -3px, 0)`;
      }
    });
  }

  function onMouseEnter() {
    setIsHovered(true);
    if (ref.current && enable3d && !reducedMotion) {
      ref.current.style.willChange = "transform";
      ref.current.style.transition = "transform 150ms ease-out";
    }
  }

  function onMouseLeave() {
    setIsHovered(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (ref.current && enable3d && !reducedMotion) {
      ref.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)";
      ref.current.style.transition = "transform 400ms cubic-bezier(0.16, 1, 0.3, 1)";
      setTimeout(() => {
        if (ref.current && !isHovered) {
          ref.current.style.willChange = "auto";
        }
      }, 400);
    }
  }

  const toneClass =
    tone === "violet"
      ? "spotlight-violet"
      : tone === "cyan"
      ? "spotlight-cyan"
      : tone === "danger"
      ? "spotlight-danger"
      : tone === "amber"
      ? "spotlight-amber"
      : tone === "white"
      ? "spotlight-white"
      : "spotlight-brand";

  const Comp = Tag as unknown as "div";

  return (
    <div className="spotlight-wrap">
      <Comp
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={isHovered ? { transition: "none" } : undefined}
        className={cx("spotlight", toneClass, className)}
      >
        {children}
      </Comp>
    </div>
  );
}


