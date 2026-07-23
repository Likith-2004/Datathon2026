import React, { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../data/DataContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ModuleAbout from "../components/ModuleAbout.jsx";
import {
  addDays,
  crimeColor,
  daysBetween,
  fmtDate,
  makeProjector,
} from "../lib/util.js";

const RING_LIFE = 14; // days a risk ripple stays visible

export default function RippleMap() {
  const { data } = useData();

  // rank districts by contagion followups so the default is lively
  const districts = useMemo(() => {
    const score = new Map();
    for (const i of data.incidents) {
      if (i.near_repeat_seed != null)
        score.set(i.district, (score.get(i.district) || 0) + 1);
    }
    return [...data.districts].sort(
      (a, b) => (score.get(b.district) || 0) - (score.get(a.district) || 0)
    );
  }, [data]);

  const [district, setDistrict] = useState(districts[0].district);
  const [mode, setMode] = useState("contagion"); // 'contagion' | 'all'
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(20); // days per second

  const totalDays = daysBetween(data.minDate, data.maxDate);
  const [day, setDay] = useState(0);
  const dayRef = useRef(0);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  // precompute district scene
  const scene = useMemo(() => {
    const incs = (data.incidentsByDistrict.get(district) || []).slice();
    if (!incs.length) return null;
    const proj = makeProjector(incs, 0.05);
    const seedIds = new Set(
      incs.map((i) => i.near_repeat_seed).filter((x) => x != null)
    );
    const enriched = incs.map((i) => ({
      x: proj.x(i.longitude),
      y: proj.y(i.latitude),
      day: daysBetween(data.minDate, i.date),
      type: i.crime_type,
      id: i.incident_id,
      seed: i.near_repeat_seed,
      gen: i.near_repeat_generation,
      isSeed: seedIds.has(i.incident_id),
    }));
    // seed lookup for connector lines
    const byId = new Map(enriched.map((e) => [e.id, e]));
    const seeds = enriched.filter((e) => e.isSeed);
    const followups = enriched.filter((e) => e.seed != null);
    const stations = data.stationsByDistrict.get(district) || [];
    const stationPts = stations.map((s) => ({
      x: proj.x(s.longitude),
      y: proj.y(s.latitude),
    }));
    return { enriched, byId, seeds, followups, stationPts, count: incs.length };
  }, [district, data]);

  // reset clock on district change
  useEffect(() => {
    dayRef.current = 0;
    setDay(0);
  }, [district]);

  // animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext("2d");
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let syncAcc = 0;

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing) {
        dayRef.current += dt * speed;
        if (dayRef.current > totalDays) dayRef.current = 0;
      }
      const d = dayRef.current;
      syncAcc += dt;
      if (syncAcc > 0.1) {
        setDay(d);
        syncAcc = 0;
      }

      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const pad = 24;
      const PX = (nx) => pad + nx * (W - 2 * pad);
      const PY = (ny) => pad + ny * (H - 2 * pad);

      // bg
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, "rgba(20,28,44,0.55)");
      g.addColorStop(1, "rgba(8,11,19,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // station markers
      ctx.fillStyle = "rgba(120,140,175,0.35)";
      for (const s of scene.stationPts) {
        ctx.beginPath();
        ctx.arc(PX(s.x), PY(s.y), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // background incidents (all mode)
      if (mode === "all") {
        for (const e of scene.enriched) {
          if (e.day > d) continue;
          if (e.seed != null || e.isSeed) continue;
          const age = d - e.day;
          const a = Math.max(0.05, 0.5 - age / 220);
          ctx.globalAlpha = a;
          ctx.fillStyle = crimeColor(e.type);
          ctx.beginPath();
          ctx.arc(PX(e.x), PY(e.y), 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // active risk ripples from seeds
      for (const s of scene.seeds) {
        const age = d - s.day;
        if (age < 0 || age > RING_LIFE) continue;
        const t = age / RING_LIFE;
        const maxR = Math.min(W, H) * 0.16;
        const r = 4 + t * maxR;
        const alpha = (1 - t) * 0.6;
        ctx.strokeStyle = `rgba(255,84,112,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(PX(s.x), PY(s.y), r, 0, Math.PI * 2);
        ctx.stroke();
        // inner glow
        ctx.strokeStyle = `rgba(255,192,74,${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(PX(s.x), PY(s.y), r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // connectors + followups
      for (const f of scene.followups) {
        if (f.day > d) continue;
        const seed = scene.byId.get(f.seed);
        const age = d - f.day;
        if (seed && age < RING_LIFE) {
          ctx.strokeStyle = `rgba(255,84,112,${Math.max(0, 0.35 - age / 40)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PX(seed.x), PY(seed.y));
          ctx.lineTo(PX(f.x), PY(f.y));
          ctx.stroke();
        }
      }

      // seeds
      for (const s of scene.seeds) {
        if (s.day > d) continue;
        const age = d - s.day;
        const pop = age < 3 ? 1 + (3 - age) * 0.6 : 1;
        ctx.fillStyle = "#38e1c9";
        ctx.beginPath();
        ctx.arc(PX(s.x), PY(s.y), 3.5 * pop, 0, Math.PI * 2);
        ctx.fill();
      }
      // followup dots
      for (const f of scene.followups) {
        if (f.day > d) continue;
        const age = d - f.day;
        const pop = age < 3 ? 1 + (3 - age) * 0.9 : 1;
        ctx.fillStyle = "#ff5470";
        ctx.globalAlpha = Math.max(0.35, 1 - age / 120);
        ctx.beginPath();
        ctx.arc(PX(f.x), PY(f.y), 2.6 * pop, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [scene, playing, speed, mode, totalDays]);

  const curDate = fmtDate(addDays(data.minDate, Math.round(day)));
  const scrub = (v) => {
    dayRef.current = v;
    setDay(v);
  };

  const seedCount = scene?.seeds.length || 0;
  const followCount = scene?.followups.length || 0;

  return (
    <div>
      <PageHeader
        eyebrow="Module C"
        title="Near-Repeat Ripple Map"
        concept="Near-repeat victimisation"
      >
        Property crime is contagious: once a home is burgled, nearby homes face
        elevated risk for days. Press play and watch — each{" "}
        <span className="text-accent">teal seed</span> throws a fading risk
        ripple, and <span className="text-warn">red follow-on crimes</span> land
        inside it soon after. That's the near-repeat signature predictive
        policing is built on.
      </PageHeader>

      <ModuleAbout
        sections={[
          {
            h: "The method",
            body: (
              <>
                <b className="text-slate-200">Near-repeat victimisation</b>{" "}
                (Townsley, Johnson & Bowers). Burglary is contagious: hitting one
                home briefly raises the risk to its neighbours, because the
                offender reuses local knowledge, escape routes and known targets.
                It's the empirical basis of predictive-policing systems.
              </>
            ),
          },
          {
            h: "How to read it",
            body: (
              <>
                Press play to run the clock across 2023–2025. A{" "}
                <span className="text-accent">teal seed</span> is an originating
                property crime; when it fires, a fading{" "}
                <span className="text-warn">risk ripple</span> expands for ~
                {RING_LIFE} days. <span className="text-warn">Red follow-on
                crimes</span> then appear — and land <em>inside</em> the ring,
                connected by a thin line back to their seed.
              </>
            ),
          },
          {
            h: "What it recovers",
            body: (
              <>
                The generator plants short contagion chains: a seed spawns 1–4
                follow-ons within ~10 days and close by, with{" "}
                <b className="text-slate-200">decaying probability per
                generation</b>. Watching red dots repeatedly fall inside a live
                ring is that planted contagion becoming visible in motion.
              </>
            ),
          },
          {
            h: "Try this",
            body: (
              <>
                Switch to <b className="text-slate-200">Contagion only</b> to
                strip the background crime away — the chains snap into focus.
                Then switch back to <b className="text-slate-200">All
                incidents</b> to appreciate how invisible the same signal is
                inside routine noise, which is exactly why it needs a model to
                surface.
              </>
            ),
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="card relative overflow-hidden p-0">
          <canvas ref={canvasRef} className="h-[62vh] min-h-[440px] w-full" />
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-ink/70 px-2 py-1">
            <div className="font-mono text-sm text-accent">{curDate}</div>
            <div className="text-[10px] text-slate-500">{district}</div>
          </div>
          {/* Playback bar */}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-edge bg-ink/80 px-3 py-2 backdrop-blur">
            <button
              className="btn w-16"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <input
              type="range"
              min={0}
              max={totalDays}
              value={Math.round(day)}
              onChange={(e) => {
                setPlaying(false);
                scrub(Number(e.target.value));
              }}
              className="flex-1"
            />
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="label">speed</span>
              <input
                type="range"
                min={4}
                max={60}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="label mb-1">District</div>
            <select
              className="input"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              {districts.map((d) => (
                <option key={d.district} value={d.district}>
                  {d.district}
                </option>
              ))}
            </select>

            <div className="label mb-1 mt-3">Layer</div>
            <div className="flex gap-2">
              <button
                className={`btn flex-1 ${mode === "contagion" ? "btn-active" : ""}`}
                onClick={() => setMode("contagion")}
              >
                Contagion only
              </button>
              <button
                className={`btn flex-1 ${mode === "all" ? "btn-active" : ""}`}
                onClick={() => setMode("all")}
              >
                All incidents
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Toggle background noise off to see how tightly the follow-on
              crimes cluster around each seed.
            </p>
          </div>

          <div className="card p-3">
            <div className="label mb-2">This district</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="font-mono text-lg text-accent">{seedCount}</div>
                <div className="label">Seed incidents</div>
              </div>
              <div>
                <div className="font-mono text-lg text-warn">{followCount}</div>
                <div className="label">Follow-on crimes</div>
              </div>
            </div>
          </div>

          <div className="card p-3 text-xs text-slate-400">
            <div className="label mb-1">Legend</div>
            <div className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
              Seed incident (triggers a ripple)
            </div>
            <div className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-warn" />
              Near-repeat follow-on
            </div>
            <div className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-warn" />
              Expanding risk ripple (~{RING_LIFE} days)
            </div>
            <div className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />
              Police station
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
