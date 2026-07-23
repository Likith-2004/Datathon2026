import React from "react";

// A radial "flower". Each petal = one metric's deviation from the station's
// own trailing 8-week baseline (0..1). Calm weeks -> small symmetric bloom;
// anomalies -> one or more long, lopsided petals.
export const BLOOM_METRICS = [
  { key: "count", label: "Case count", color: "#ff5470" },
  { key: "peak", label: "Category surge", color: "#ffc04a" },
  { key: "mix", label: "Mix shift", color: "#c77dff" },
  { key: "sev", label: "Avg severity", color: "#4aa3ff" },
  { key: "resp", label: "Response time", color: "#57d97b" },
];

export default function BloomGlyph({ petals, size = 60, score = 0, highlight }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.44;
  const n = BLOOM_METRICS.length;
  const half = (size * 0.11) / 1; // petal half-width

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={R * 0.28}
        fill="none"
        stroke="#22304a"
        strokeWidth={0.5}
      />
      {BLOOM_METRICS.map((m, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const L = R * (0.18 + 0.82 * (petals?.[m.key] ?? 0));
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const px = -dy;
        const py = dx; // perpendicular
        const tip = [cx + dx * L, cy + dy * L];
        const c1 = [cx + dx * L * 0.5 + px * half, cy + dy * L * 0.5 + py * half];
        const c2 = [cx + dx * L * 0.5 - px * half, cy + dy * L * 0.5 - py * half];
        const d = `M ${cx} ${cy} Q ${c1[0]} ${c1[1]} ${tip[0]} ${tip[1]} Q ${c2[0]} ${c2[1]} ${cx} ${cy} Z`;
        const strong = (petals?.[m.key] ?? 0) > 0.55;
        return (
          <path
            key={m.key}
            d={d}
            fill={m.color}
            fillOpacity={strong ? 0.75 : 0.4}
            stroke={m.color}
            strokeOpacity={0.7}
            strokeWidth={0.5}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={1.6} fill="#e7ecf4" />
      {highlight && (
        <circle
          cx={cx}
          cy={cy}
          r={R + 1}
          fill="none"
          stroke="#ff5470"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
