"use client";

import { useMemo } from "react";

type FlowPath = {
  d: string;
  opacity: number;
  width: number;
};

function buildFlowPath(
  width: number,
  height: number,
  offset: number,
  side: "top" | "bottom",
) {
  const points = 44;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const spread = 0.18 + offset * 0.82;
  const sign = side === "top" ? -1 : 1;
  const values: string[] = [];

  for (let i = 0; i < points; i += 1) {
    const x = -width * 0.08 + (width * 1.16 * i) / (points - 1);
    const nx = Math.abs(x - centerX) / (width * 0.58);
    const edge = Math.pow(Math.min(nx, 1.35), 0.78);
    const waist = 0.035 + spread * (0.18 + 0.82 * edge);
    const wave =
      Math.sin(i * 0.34 + offset * 21) * (1.2 + offset * 2.4) +
      Math.sin(i * 0.12 + offset * 9) * 0.8;
    const y = centerY + sign * (height * waist + wave);
    values.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return values.join(" ");
}

export default function QronosBackground() {
  const paths = useMemo<FlowPath[]>(() => {
    const width = 1800;
    const height = 980;
    const result: FlowPath[] = [];

    for (let i = 0; i < 54; i += 1) {
      const offset = (i + 1) / 55;
      result.push({
        d: buildFlowPath(width, height, offset, "top"),
        opacity: 0.16 + (1 - offset) * 0.26,
        width: i % 7 === 0 ? 1.15 : 0.72,
      });
      result.push({
        d: buildFlowPath(width, height, offset, "bottom"),
        opacity: 0.16 + (1 - offset) * 0.26,
        width: i % 7 === 0 ? 1.15 : 0.72,
      });
    }

    return result;
  }, []);

  return (
    <div className="nh-qronos-background" aria-hidden="true">
      <div className="nh-qronos-vignette" />
      <div className="nh-qronos-glow" />
      <svg
        className="nh-qronos-flow"
        viewBox="0 0 1800 980"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <linearGradient id="nh-qronos-line" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".18" />
            <stop offset=".24" stopColor="#ffffff" stopOpacity=".38" />
            <stop offset=".5" stopColor="#ffffff" stopOpacity=".9" />
            <stop offset=".76" stopColor="#ffffff" stopOpacity=".38" />
            <stop offset="1" stopColor="#ffffff" stopOpacity=".12" />
          </linearGradient>
          <radialGradient id="nh-qronos-core">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".5" />
            <stop offset=".3" stopColor="#dff7ff" stopOpacity=".16" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id="nh-qronos-soft">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        <ellipse
          className="nh-qronos-core-glow"
          cx="900"
          cy="490"
          rx="270"
          ry="190"
          fill="url(#nh-qronos-core)"
        />

        <g className="nh-qronos-flow-lines">
          {paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill="none"
              stroke="url(#nh-qronos-line)"
              strokeWidth={path.width}
              strokeOpacity={path.opacity}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        <g className="nh-qronos-flow-particles">
          {paths.filter((_, i) => i % 4 === 0).map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity=".8"
              strokeDasharray="1 28"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        <g className="nh-qronos-fine-flow" filter="url(#nh-qronos-soft)">
          {paths.filter((_, i) => i % 3 === 0).map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill="none"
              stroke="#dff7ff"
              strokeWidth=".55"
              strokeOpacity=".34"
              strokeDasharray="1 12"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>

      <div className="nh-qronos-noise" />
      <div className="nh-qronos-spark nh-qronos-spark-1" />
      <div className="nh-qronos-spark nh-qronos-spark-2" />
      <div className="nh-qronos-spark nh-qronos-spark-3" />
    </div>
  );
}
