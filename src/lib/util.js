// small shared helpers

export function parseDate(s) {
  // "YYYY-MM-DD" -> Date (UTC midnight, avoids TZ drift)
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const DAY_MS = 86400000;

export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / DAY_MS);
}

export function fmtDate(d) {
  const dt = d instanceof Date ? d : parseDate(d);
  return dt.toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const dt = parseDate(dateStr);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmtDate(dt);
}

// week index (0-based) from a min date, using 7-day buckets
export function weekIndex(dateStr, minDateStr) {
  return Math.floor(daysBetween(minDateStr, dateStr) / 7);
}

// Monday of the week containing dateStr (matches pandas W-SUN start_time,
// used to join incidents to weekly_station_stats.week_start).
export function mondayOf(dateStr) {
  const dt = parseDate(dateStr);
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const shift = dow === 0 ? 6 : dow - 1; // days back to Monday
  dt.setUTCDate(dt.getUTCDate() - shift);
  return fmtDate(dt);
}

// Consistent categorical color per crime type
const CRIME_COLORS = {
  Theft: "#38e1c9",
  Burglary: "#4aa3ff",
  "Chain Snatching": "#ff5470",
  "Vehicle Theft": "#ffc04a",
  Robbery: "#ff8f3f",
  Assault: "#f25f5c",
  "Cheating/Fraud": "#7c5cff",
  Cybercrime: "#c77dff",
  Narcotics: "#57d97b",
  "Domestic Violence": "#ff9ec7",
  Kidnapping: "#e0e0e0",
  "Sexual Assault": "#ff6b9d",
  Rioting: "#b5651d",
  Murder: "#ff3b3b",
};
export function crimeColor(t) {
  return CRIME_COLORS[t] || "#8aa0c0";
}

// linear projection of lat/lon into [0,1] within a bounding box (with padding)
export function makeProjector(points, pad = 0.08) {
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  let minLat = Math.min(...lats),
    maxLat = Math.max(...lats);
  let minLon = Math.min(...lons),
    maxLon = Math.max(...lons);
  const dLat = (maxLat - minLat) || 0.01;
  const dLon = (maxLon - minLon) || 0.01;
  minLat -= dLat * pad;
  maxLat += dLat * pad;
  minLon -= dLon * pad;
  maxLon += dLon * pad;
  return {
    x: (lon) => (lon - minLon) / (maxLon - minLon),
    y: (lat) => 1 - (lat - minLat) / (maxLat - minLat), // north up
    bounds: { minLat, maxLat, minLon, maxLon },
  };
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
