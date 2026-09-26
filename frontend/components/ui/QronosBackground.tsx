"use client";

import { useMemo } from "react";

type FlowPath = {
  d: string;
  opacity: number;
  width: number;
};

function makeStreamline(index: number, total: number) {
  const W = 1800;
  const H = 980;
  const cx = W / 2;
  const t = index / (total - 1);
  const offset = (t - 0.5) * 2;
  const abs = Math.abs(offset);

  // The Qronos reference is a continuous hourglass/vortex:
  // wide at the top, pinched at the center, then wide again at the bottom.
  const topX = cx + offset * 720;
  const bottomX = cx - offset * 720;
  const waistX = cx + offset * 62;
  const side = offset >= 0 ? 1 : -1;

  const points: string[] = [];
  const samples = 72;

  for (let i = 0; i < samples; i += 1) {
    const y = (i / (samples - 1)) * H;
    const p = y / H;
    const pinch = Math.pow(Math.abs(p - 0.5) * 2, 0.62);
    const targetX = cx + (topX - cx) * pinch;
    const mirrored = p > 0.5 ? cx + (bottomX - cx) * pinch : targetX;

    const wave =
      Math.sin(p * 18 + index * 0.19) * (1.2 + abs * 2.4) +
      Math.sin(p * 42 + index * 0.07) * 0.55;

    const x = p < 0.5 ? mirrored + wave : mirrored + wave;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return {
    d: points.join(" "),
    opacity: 0.16 + (1 - abs) * 0.36,
    width: abs > 0.82 ? 0.62 : index % 9 === 0 ? 1.08 : 0.78,
  };
}

function makeArc(index: number, total: number, top: boolean) {
  const W = 1800;
  const H = 980;
  const cx = W / 2;
  const t = index / (total - 1);
  const offset = (t - 0.5) * 2;
  const y0 = top ? 20 : H - 20;
  const y1 = top ? 430 : H - 430;
  const x0 = cx + offset * 690;
  const x1 = cx + offset * 72;
  const bend = top ? 1 : -1;
  return `M ${x0.toFixed(1)} ${y0} C ${(cx + offset * 610).toFixed(1)} ${(y0 + bend * 150).toFixed(1)}, ${(cx + offset * 220).toFixed(1)} ${(y1 + bend * 40).toFixed(1)}, ${x1.toFixed(1)} ${y1}`;
}

export default function QronosBackground() {
  const lines = useMemo(() => {
    const total = 150;
    return Array.from({ length: total }, (_, i) => makeStreamline(i, total));
  }, []);

  const arcs = useMemo(() => {
    const total = 95;
    return Array.from({ length: total }, (_, i) => ({
      top: makeArc(i, total, true),
      bottom: makeArc(i, total, false),
    }));
  }, []);

  return (
    <div className="nh-qronos-background" aria-hidden="true">
      <div className="nh-qronos-qronos-glow" />
      <svg className="nh-qronos-flow" viewBox="0 0 1800 980" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="nh-qronos-stream" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity=".08" />
            <stop offset=".24" stopColor="#fff" stopOpacity=".3" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".88" />
            <stop offset=".76" stopColor="#fff" stopOpacity=".3" />
            <stop offset="1" stopColor="#fff" stopOpacity=".08" />
          </linearGradient>
          <radialGradient id="nh-qronos-waist">
            <stop offset="0" stopColor="#fff" stopOpacity=".16" />
            <stop offset=".42" stopColor="#dff7ff" stopOpacity=".055" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="nh-qronos-blur">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        <ellipse className="nh-qronos-waist-glow" cx="900" cy="490" rx="230" ry="150" fill="url(#nh-qronos-waist)" />

        <g className="nh-qronos-streamlines">
          {lines.map((line, i) => (
            <path
              key={i}
              d={line.d}
              fill="none"
              stroke="url(#nh-qronos-stream)"
              strokeOpacity={line.opacity}
              strokeWidth={line.width}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        <g className="nh-qronos-arc-lines">
          {arcs.map((arc, i) => (
            <g key={i}>
              <path d={arc.top} />
              <path d={arc.bottom} />
            </g>
          ))}
        </g>

        <g className="nh-qronos-particle-lines">
          {lines.filter((_, i) => i % 3 === 0).map((line, i) => (
            <path
              key={i}
              d={line.d}
              fill="none"
              stroke="#fff"
              strokeWidth=".9"
              strokeOpacity=".75"
              strokeLinecap="round"
              strokeDasharray="1 34"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        <g className="nh-qronos-fine-lines" filter="url(#nh-qronos-blur)">
          {lines.filter((_, i) => i % 2 === 0).map((line, i) => (
            <path
              key={i}
              d={line.d}
              fill="none"
              stroke="#e9fbff"
              strokeWidth=".5"
              strokeOpacity=".28"
              strokeDasharray="1 17"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
