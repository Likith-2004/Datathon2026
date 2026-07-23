import React from "react";
import { MO_AXES, axisRadius } from "../lib/mo.js";

// stable hue from the full MO vector so identical fingerprints look like twins
function moHue(o) {
  const s = MO_AXES.map((a) => o[a.key]).join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export default function MoGlyph({
  offender,
  size = 64,
  showAxes = false,
  emphasize = false,
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.42;
  const n = MO_AXES.length;
  const hue = moHue(offender);
  const stroke = `hsl(${hue} 85% 68%)`;
  const fill = `hsl(${hue} 80% 60%)`;

  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pts = MO_AXES.map((axis, i) => {
    const r = axisRadius(axis, offender[axis.key]) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  });
  const poly = pts.map((p) => p.join(",")).join(" ");

  const rings = [0.33, 0.66, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* grid rings */}
      {rings.map((rr, k) => {
        const rp = MO_AXES.map((_, i) => {
          const r = rr * R;
          return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))].join(
            ","
          );
        }).join(" ");
        return (
          <polygon
            key={k}
            points={rp}
            fill="none"
            stroke="#22304a"
            strokeWidth={0.5}
          />
        );
      })}
      {/* spokes */}
      {MO_AXES.map((_, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + R * Math.cos(angle(i))}
          y2={cy + R * Math.sin(angle(i))}
          stroke="#22304a"
          strokeWidth={0.5}
        />
      ))}
      {/* MO polygon */}
      <polygon
        points={poly}
        fill={fill}
        fillOpacity={emphasize ? 0.4 : 0.28}
        stroke={stroke}
        strokeWidth={emphasize ? 2 : 1.3}
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={emphasize ? 2 : 1.4} fill={stroke} />
      ))}
      {showAxes &&
        MO_AXES.map((axis, i) => {
          const lr = R + size * 0.13;
          const x = cx + lr * Math.cos(angle(i));
          const y = cy + lr * Math.sin(angle(i));
          return (
            <text
              key={i}
              x={x}
              y={y}
              fontSize={size * 0.06}
              fill="#7c8aa5"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {axis.label}
            </text>
          );
        })}
    </svg>
  );
}
