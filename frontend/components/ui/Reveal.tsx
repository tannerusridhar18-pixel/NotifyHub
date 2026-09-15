"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "./classes";

export default function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "scale" | "fade";
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced-motion bypass
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const variantStyles =
    variant === "scale"
      ? visible
        ? "opacity-100 scale-100 translate-y-0"
        : "opacity-0 scale-95 translate-y-4"
      : variant === "fade"
      ? visible
        ? "opacity-100"
        : "opacity-0"
      : visible
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-6";

  const Comp = Tag as unknown as "div";
  return (
    <Comp
      ref={ref}
      className={cx("transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]", variantStyles, className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Comp>
  );
}

