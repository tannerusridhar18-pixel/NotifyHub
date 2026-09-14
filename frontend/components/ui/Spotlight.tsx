"use client";
import { cx } from "./classes";

export default function Spotlight({
  children,
  className,
  tone = "brand",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "brand" | "white";
  as?: "div" | "article";
}) {
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }
  const Comp = Tag as unknown as "div";
  return (
    <Comp onMouseMove={onMove} className={cx("spotlight", tone === "white" ? "spotlight-white" : "spotlight-brand", className)}>
      {children}
    </Comp>
  );
}
