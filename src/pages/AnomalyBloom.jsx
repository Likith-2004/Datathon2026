import React, { useMemo, useState } from "react";
import { useData } from "../data/DataContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import BloomGlyph, { BLOOM_METRICS } from "../components/BloomGlyph.jsx";
import { mondayOf } from "../lib/util.js";

const WINDOW = 8; // trailing weeks for baseline
const SCORE_THRESHOLD = 0.6;

function mean(a) {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}
function std(a, m) {
  if (a.length < 2) return 0;
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
}

export default function AnomalyBloom() {
  const { data } = useData();

  // per (station|monday) category counts + totals, computed once
  const catByKey = useMemo(() => {
    const m = new Map();
    for (const inc of data.incidents) {
      const key = `${inc.station_id}|${mondayOf(inc.date)}`;
      let e = m.get(key);
      if (!e) {
        e = { total: 0, types: {} };
        m.set(key, e);
      }
      e.total++;
      e.types[inc.crime_type] = (e.types[inc.crime_type] || 0) + 1;
    }
    return m;
  }, [data]);

  // weekly stats grouped by station, sorted by week
  const statsByStation = useMemo(() => {
    const m = new Map();
    for (const r of data.weeklyStats) {
      if (!m.has(r.station_id)) m.set(r.station_id, []);
      m.get(r.station_id).push(r);
    }
    for (const arr of m.values())
      arr.sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
    return m;
  }, [data]);

  const crimeTypes = data.crimeTypes;

  // compute the bloom petals for every week of one station
  const computeStation = useMemo(() => {
    return (stationId) => {
      const rows = statsByStation.get(stationId) || [];
      const shareOf = (r) => {
        const e = catByKey.get(`${stationId}|${r.week_start}`);
        const total = e?.total || 0;
        const v = {};
        for (const t of crimeTypes) v[t] = total ? (e.types[t] || 0) / total : 0;
        return v;
      };
      const shares = rows.map(shareOf);

      return rows.map((r, i) => {
        const start = Math.max(0, i - WINDOW);
        const hist = rows.slice(start, i);
        const cCount = hist.map((h) => h.case_count);
        const cSev = hist.map((h) => h.avg_severity);
        const cResp = hist.map((h) => h.avg_response_time_min);
        const mCount = mean(cCount);
        const mSev = mean(cSev);
        const mResp = mean(cResp);
        const sCount = Math.max(std(cCount, mCount), 1.2);
        const sSev = Math.max(std(cSev, mSev), 0.25);
        const sResp = Math.max(std(cResp, mResp), 3);

        // baseline mean share per type
        const baseShare = {};
        for (const t of crimeTypes) {
          baseShare[t] = mean(shares.slice(start, i).map((s) => s[t]));
        }
        const nowShare = shares[i];
        let tvd = 0;
        let peak = 0;
        for (const t of crimeTypes) {
          tvd += Math.abs(nowShare[t] - baseShare[t]);
          peak = Math.max(peak, nowShare[t] - baseShare[t]);
        }
        tvd *= 0.5;

        const clamp01 = (x) => Math.max(0, Math.min(1, x));
        const petals = {
          count: hist.length >= 2 ? clamp01(Math.max(0, (r.case_count - mCount) / sCount) / 3.5) : 0,
          sev: hist.length >= 2 ? clamp01(Math.abs((r.avg_severity - mSev) / sSev) / 3.5) : 0,
          resp: hist.length >= 2 ? clamp01(Math.abs((r.avg_response_time_min - mResp) / sResp) / 3.5) : 0,
          mix: hist.length >= 2 ? clamp01(tvd * 2.2) : 0,
          peak: hist.length >= 2 ? clamp01(peak * 2.4) : 0,
        };
        // anomaly score emphasises count/peak/mix (a real crime spike)
        const score = Math.max(petals.count, petals.peak, petals.mix);
        // dominant surging category for the detail panel
        let domType = null,
          domSurge = -1;
        for (const t of crimeTypes) {
          const s = nowShare[t] - baseShare[t];
          if (s > domSurge) {
            domSurge = s;
            domType = t;
          }
        }
        const excess = Math.max(0, r.case_count - mCount);
        return {
          week_start: r.week_start,
          case_count: r.case_count,
          avg_severity: r.avg_severity,
          avg_response_time_min: r.avg_response_time_min,
          baseline: { count: mCount, sev: mSev, resp: mResp },
          petals,
          score,
          excess,
          // magnitude-aware rank: a spike at a busy station outweighs the same
          // shape at a near-idle one (fewer false positives from tiny baselines)
          rankScore: score * Math.log2(2 + excess),
          domType,
          zCount: hist.length >= 2 ? (r.case_count - mCount) / sCount : 0,
        };
      });
    };
  }, [statsByStation, catByKey, crimeTypes]);

  // detected anomaly leaderboard across all stations (recovery demo)
  const leaderboard = useMemo(() => {
    const out = [];
    for (const stationId of statsByStation.keys()) {
      const weeks = computeStation(stationId);
      let best = null;
      for (const w of weeks)
        if (!best || w.rankScore > best.rankScore) best = w;
      if (best) out.push({ stationId, week: best });
    }
    out.sort((a, b) => b.week.rankScore - a.week.rankScore);
    return out;
  }, [statsByStation, computeStation]);

  // ground-truth anomaly weeks
  const gtAnomaly = data.groundTruth.anomaly_weeks || [];
  const gtByStationWeek = useMemo(() => {
    const s = new Set(gtAnomaly.map((a) => `${a.station_id}|${a.week_start}`));
    return s;
  }, [gtAnomaly]);
  const gtStations = Array.from(new Set(gtAnomaly.map((a) => a.station_id)));

  const [station, setStation] = useState(gtStations[0] || leaderboard[0]?.stationId);
  const [selWeek, setSelWeek] = useState(null);

  const weeks = useMemo(() => computeStation(station), [computeStation, station]);
  const stationInfo = data.stationById.get(station);
  const stationAnomWeeks = new Set(
    gtAnomaly.filter((a) => a.station_id === station).map((a) => a.week_start)
  );

  const detected = weeks.filter((w) => w.score >= SCORE_THRESHOLD);

  // recovery: are the ground-truth anomaly weeks among detected?
  const recovered = gtAnomaly.filter(
    (a) =>
      computeStation(a.station_id).find((w) => w.week_start === a.week_start)
        ?.score >= SCORE_THRESHOLD
  );

  const allStationsSorted = useMemo(
    () =>
      [...statsByStation.keys()].sort((a, b) => {
        const na = data.stationById.get(a)?.station_name || a;
        const nb = data.stationById.get(b)?.station_name || b;
        return na < nb ? -1 : 1;
      }),
    [statsByStation, data]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Module E"
        title="Anomaly Bloom Glyphs"
        concept="Statistical anomaly detection"
      >
        Each flower is one police station in one week. Its petals measure that
        week against the station's <b className="text-slate-200">own trailing
        8-week baseline</b> — so a normal week is a small, round bloom and a real
        spike erupts into a lopsided flare you can spot without reading a single
        number.
      </PageHeader>

      <div className="mb-3 grid gap-3 lg:grid-cols-[1fr_360px]">
        {/* recovery banner */}
        <div className="card border-accent/30 bg-accent/5 p-3 text-sm">
          <div className="label mb-1 text-accent">Ground-truth recovery</div>
          The generator injected <b className="text-white">{gtAnomaly.length}</b>{" "}
          true anomaly weeks. This detector (score ≥ {SCORE_THRESHOLD}) flags{" "}
          <b className="text-white">
            {recovered.length}/{gtAnomaly.length}
          </b>{" "}
          of them — each appears in the leaderboard on the right and blooms
          violently when you open its station below.
        </div>
        <div className="card p-3">
          <div className="label mb-1">Petal legend</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {BLOOM_METRICS.map((m) => (
              <span key={m.key} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: m.color }}
                />
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Blooms grid */}
        <div className="card p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <select
              className="input max-w-[260px]"
              value={station}
              onChange={(e) => {
                setStation(e.target.value);
                setSelWeek(null);
              }}
            >
              {allStationsSorted.map((sid) => {
                const s = data.stationById.get(sid);
                return (
                  <option key={sid} value={sid}>
                    {s?.station_name} · {s?.district}
                  </option>
                );
              })}
            </select>
            <span className="text-xs text-slate-500">
              {weeks.length} weeks · {detected.length} flagged
            </span>
            <span className="ml-auto text-xs text-slate-500">
              Jump to injected anomaly:
            </span>
            {gtStations.map((sid) => (
              <button
                key={sid}
                className={`chip cursor-pointer border-warn/40 text-warn hover:bg-warn/10 ${
                  station === sid ? "bg-warn/10" : ""
                }`}
                onClick={() => {
                  setStation(sid);
                  setSelWeek(null);
                }}
              >
                {data.stationById.get(sid)?.station_name || sid}
              </button>
            ))}
          </div>

          <div className="grid max-h-[60vh] grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-1 overflow-auto pr-1">
            {weeks.map((w) => {
              const isGt = stationAnomWeeks.has(w.week_start);
              const flagged = w.score >= SCORE_THRESHOLD;
              const sel = selWeek === w.week_start;
              return (
                <button
                  key={w.week_start}
                  onClick={() => setSelWeek(w.week_start)}
                  title={`${w.week_start} · score ${(w.score * 100).toFixed(0)}`}
                  className={`rounded-lg border p-0.5 transition ${
                    sel
                      ? "border-accent bg-accent/10"
                      : flagged
                      ? "border-warn/40"
                      : "border-transparent hover:border-edge"
                  }`}
                >
                  <BloomGlyph petals={w.petals} size={54} highlight={isGt} />
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Red-ringed blooms are the planted ground-truth anomalies. Notice they
            are exactly the lopsided ones — the visual and the ground truth
            agree.
          </p>
        </div>

        {/* Right column: detail + leaderboard */}
        <div className="space-y-3">
          {selWeek ? (
            (() => {
              const w = weeks.find((x) => x.week_start === selWeek);
              if (!w) return null;
              const rows = [
                {
                  k: "count",
                  label: "Case count",
                  val: w.case_count,
                  base: w.baseline.count,
                  unit: "",
                },
                {
                  k: "sev",
                  label: "Avg severity",
                  val: w.avg_severity?.toFixed(2),
                  base: w.baseline.sev,
                  unit: "",
                },
                {
                  k: "resp",
                  label: "Response time",
                  val: w.avg_response_time_min?.toFixed(1),
                  base: w.baseline.resp,
                  unit: "min",
                },
              ];
              return (
                <div className="card p-4">
                  <div className="flex items-center gap-3">
                    <BloomGlyph
                      petals={w.petals}
                      size={92}
                      highlight={stationAnomWeeks.has(w.week_start)}
                    />
                    <div>
                      <div className="text-sm font-semibold">
                        Week of {w.week_start}
                      </div>
                      <div className="text-xs text-slate-500">
                        {stationInfo?.station_name}
                      </div>
                      <div
                        className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
                          w.score >= SCORE_THRESHOLD
                            ? "bg-warn/20 text-warn"
                            : "bg-edge text-slate-400"
                        }`}
                      >
                        anomaly score {(w.score * 100).toFixed(0)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    {rows.map((r) => {
                      const dev = w.baseline[r.k]
                        ? (Number(w.val ?? 0) - r.base)
                        : 0;
                      return (
                        <div
                          key={r.k}
                          className="flex items-center justify-between border-b border-edge/60 py-1"
                        >
                          <span className="text-slate-500">{r.label}</span>
                          <span className="text-slate-200">
                            {r.val}
                            {r.unit}{" "}
                            <span className="text-slate-500">
                              (base {r.base?.toFixed?.(1) ?? r.base})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Case-count z-score</span>
                      <span
                        className={
                          w.zCount > 2 ? "text-warn font-semibold" : "text-slate-200"
                        }
                      >
                        {w.zCount >= 0 ? "+" : ""}
                        {w.zCount.toFixed(1)}σ
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Surging category</span>
                      <span className="text-gold">{w.domType || "—"}</span>
                    </div>
                  </div>
                  {stationAnomWeeks.has(w.week_start) && (
                    <div className="mt-2 rounded bg-warn/10 p-2 text-[11px] text-warn">
                      ✓ This is a planted ground-truth anomaly week. The detector
                      caught it.
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="card p-4 text-sm text-slate-400">
              <div className="label mb-1">Click any bloom</div>
              Open a week to see its raw metrics and exactly how far each one
              deviates from the station's baseline.
            </div>
          )}

          <div className="card p-3">
            <div className="label mb-2">Detected anomalies · all stations</div>
            <div className="max-h-[38vh] space-y-1 overflow-auto pr-1">
              {leaderboard.slice(0, 14).map(({ stationId, week }) => {
                const isGt = gtByStationWeek.has(
                  `${stationId}|${week.week_start}`
                );
                const s = data.stationById.get(stationId);
                return (
                  <button
                    key={stationId}
                    onClick={() => {
                      setStation(stationId);
                      setSelWeek(week.week_start);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg border border-edge bg-ink/40 p-1.5 text-left text-xs transition hover:border-accent/50"
                  >
                    <BloomGlyph petals={week.petals} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-slate-200">
                        {s?.station_name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {week.week_start}
                      </div>
                    </div>
                    {isGt && (
                      <span className="rounded bg-warn/20 px-1 text-[9px] font-semibold text-warn">
                        planted
                      </span>
                    )}
                    <span className="font-mono text-warn">
                      {(week.score * 100).toFixed(0)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              "planted" tags are the injected anomalies — they rise to the top of
              a purely statistical ranking that never saw the ground truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
