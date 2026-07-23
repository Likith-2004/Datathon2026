// Modus-operandi vector definitions shared across modules.
// 5 categorical axes; each value maps to an ordinal index used for the
// radial glyph radius and for weighted categorical similarity.

export const MO_AXES = [
  {
    key: "mo_transport",
    label: "Transport",
    values: ["Two-wheeler", "On foot", "Car", "Auto-rickshaw", "None"],
  },
  {
    key: "mo_entry",
    label: "Entry",
    values: [
      "Forced entry",
      "Unlocked access",
      "Deception/impersonation",
      "Online/remote",
      "N/A",
    ],
  },
  {
    key: "mo_weapon",
    label: "Weapon",
    values: ["None", "Knife", "Blunt object", "Firearm", "Chemical/spray"],
  },
  {
    key: "mo_target",
    label: "Target",
    values: [
      "Individual - stranger",
      "Individual - known",
      "Residence",
      "Commercial estab.",
      "Vehicle",
      "Online account",
    ],
  },
  {
    key: "mo_timeband",
    label: "Time band",
    values: [
      "Early morning (12-6)",
      "Morning (6-12)",
      "Afternoon (12-17)",
      "Evening (17-21)",
      "Night (21-24)",
    ],
  },
];

// index of a categorical value within its axis (0..n-1)
export function axisIndex(axis, value) {
  const i = axis.values.indexOf(value);
  return i < 0 ? 0 : i;
}

// normalized radius 0.15..1 for a glyph vertex
export function axisRadius(axis, value) {
  const n = axis.values.length;
  const i = axisIndex(axis, value);
  return 0.2 + 0.8 * (i / (n - 1));
}

// Weighted categorical MO similarity in [0,1].
// Weapon + target are the strongest identity signals for linkage analysis.
const WEIGHTS = {
  mo_transport: 1,
  mo_entry: 1.2,
  mo_weapon: 1.6,
  mo_target: 1.6,
  mo_timeband: 0.9,
};
const WEIGHT_SUM = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

export function moSimilarity(a, b) {
  let s = 0;
  for (const axis of MO_AXES) {
    if (a[axis.key] === b[axis.key]) s += WEIGHTS[axis.key];
  }
  return s / WEIGHT_SUM;
}
