import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceX,
  forceY,
  forceCollide,
} from "d3";
import { useData } from "../data/DataContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { addDays, daysBetween, fmtDate } from "../lib/util.js";

const GANG_COLORS = [
  "#38e1c9", "#7c5cff", "#ff5470", "#ffc04a", "#57d97b", "#4aa3ff",
  "#ff8f3f", "#c77dff", "#ff9ec7", "#f25f5c", "#5ad1e6", "#b9f27c",
  "#ffd166", "#e07bff", "#66e0a3", "#ff6b9d", "#9bb1ff", "#ffb37a",
  "#7de0d0", "#d4a5ff", "#ffcf5c", "#8affc1",
];

export default function NetworkGravity() {
  const { data } = useData();
  const totalDays = daysBetween(data.minDate, data.maxDate);

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(12);
  const [day, setDay] = useState(0);
  const [focusGang, setFocusGang] = useState(null);
  const [hover, setHover] = useState(null);

  const dayRef = useRef(0);
  const playRef = useRef(true);
  const speedRef = useRef(12);
  const focusRef = useRef(null);
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => void (playRef.current = playing), [playing]);
  useEffect(() => void (speedRef.current = speed), [speed]);
  useEffect(() => void (focusRef.current = focusGang), [focusGang]);

  // fragmentation ground truth
  const fragInfo = useMemo(() => {
    const m = new Map();
    for (const f of data.groundTruth.fragmenting_gangs || []) {
      m.set(f.gang_id, {
        fragDay: daysBetween(data.minDate, f.fragment_event_date),
        breakaway: new Set(f.breakaway_members),
        date: f.fragment_event_date,
        n: f.breakaway_members.length,
      });
    }
    return m;
  }, [data]);

  // build co-offending graph
  const graph = useMemo(() => {
    const co = data.edges.filter((e) => e.edge_type === "co_offending");
    const nodeMap = new Map();
    const gangIds = Array.from(new Set(co.map((e) => e.gang_id)));
    const gangColor = new Map(
      gangIds.map((g, i) => [g, GANG_COLORS[i % GANG_COLORS.length]])
    );

    const ensure = (id, gang) => {
      if (!nodeMap.has(id))
        nodeMap.set(id, { id, gang, deg: 0, x: 0, y: 0, vx: 0, vy: 0 });
      return nodeMap.get(id);
    };
    const links = co.map((e) => {
      const s = ensure(e.source, e.gang_id);
      const t = ensure(e.target, e.gang_id);
      s.deg++;
      t.deg++;
      return {
        source: e.source,
        target: e.target,
        gang: e.gang_id,
        from: daysBetween(data.minDate, e.active_from),
        to: daysBetween(data.minDate, e.active_to),
        frag: e.fragment_event_date
          ? daysBetween(data.minDate, e.fragment_event_date)
          : null,
      };
    });
    const nodes = Array.from(nodeMap.values());

    // gang grid centers
    const G = gangIds.length;
    const cols = Math.ceil(Math.sqrt(G));
    const rows = Math.ceil(G / cols);
    const centers = new Map();
    gangIds.forEach((g, i) => {
      const cx = ((i % cols) + 0.5) / cols;
      const cy = (Math.floor(i / cols) + 0.5) / rows;
      centers.set(g, { cx, cy });
    });

    return { nodes, links, gangIds, gangColor, centers, cols, rows };
  }, [data]);

  graphRef.current = graph;

  useEffect(() => {
    dayRef.current = 0;
    setDay(0);
  }, []);

  // simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph.nodes.length) return;
    const ctx = canvas.getContext("2d");
    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

    let W = 0,
      H = 0,
      dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // seed node positions near gang centers
    for (const n of graph.nodes) {
      const c = graph.centers.get(n.gang);
      n.x = (c.cx + (Math.random() - 0.5) * 0.1) * (W || 800);
      n.y = (c.cy + (Math.random() - 0.5) * 0.1) * (H || 500);
    }

    const px = (nx) => nx * W;
    const py = (ny) => ny * H;

    const targetOf = (n) => {
      const c = graph.centers.get(n.gang);
      const frag = fragInfo.get(n.gang);
      let cx = c.cx,
        cy = c.cy;
      if (frag && frag.breakaway.has(n.id) && dayRef.current >= frag.fragDay) {
        // splinter drifts outward from board centre
        const dx = c.cx - 0.5;
        const dy = c.cy - 0.5;
        const len = Math.hypot(dx, dy) || 1;
        cx = c.cx + (dx / len) * 0.14 + 0.06;
        cy = c.cy + (dy / len) * 0.14;
      }
      return [px(cx), py(cy)];
    };

    const linkActive = (l) => dayRef.current >= l.from && dayRef.current <= l.to;

    const sim = forceSimulation(graph.nodes)
      .force(
        "link",
        forceLink(graph.links)
          .id((d) => d.id)
          .distance(34)
          .strength((l) => (linkActive(l) ? 0.5 : 0))
      )
      .force("charge", forceManyBody().strength(-26))
      .force("x", forceX((n) => targetOf(n)[0]).strength(0.14))
      .force("y", forceY((n) => targetOf(n)[1]).strength(0.14))
      .force("collide", forceCollide(7))
      .stop();
    simRef.current = sim;

    let last = performance.now();
    let syncAcc = 0;
    let raf = 0;

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playRef.current) {
        dayRef.current += dt * speedRef.current;
        if (dayRef.current > totalDays) dayRef.current = 0;
      }
      syncAcc += dt;
      if (syncAcc > 0.12) {
        setDay(dayRef.current);
        syncAcc = 0;
      }

      sim.alpha(Math.max(sim.alpha(), 0.25));
      sim.tick();

      const d = dayRef.current;
      const focus = focusRef.current;
      ctx.clearRect(0, 0, W, H);

      // edges
      for (const l of graph.links) {
        if (!(d >= l.from && d <= l.to)) continue;
        const s = l.source,
          t = l.target;
        const dim = focus && l.gang !== focus;
        const justBroke = l.frag != null; // a cross-group tie that will die at frag
        ctx.strokeStyle = dim
          ? "rgba(120,130,150,0.06)"
          : justBroke
          ? "rgba(255,84,112,0.35)"
          : "rgba(150,170,210,0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      }

      // nodes
      for (const n of graph.nodes) {
        const active = graph.links.some(
          (l) =>
            (l.source.id === n.id || l.target.id === n.id) &&
            d >= l.from &&
            d <= l.to
        );
        const frag = fragInfo.get(n.gang);
        const isBreak =
          frag && frag.breakaway.has(n.id) && d >= frag.fragDay;
        const dim = focus && n.gang !== focus;
        const r = 3 + Math.min(6, Math.sqrt(n.deg));
        ctx.globalAlpha = dim ? 0.15 : active ? 1 : 0.18;
        ctx.fillStyle = graph.gangColor.get(n.gang);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (isBreak && !dim) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 2.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // hover hit-test
    const onMove = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      let best = null,
        bd = 100;
      for (const n of graph.nodes) {
        const dd = (n.x - mx) ** 2 + (n.y - my) ** 2;
        if (dd < bd) {
          bd = dd;
          best = n;
        }
      }
      if (best) {
        const o = data.offenderById.get(best.id);
        setHover({
          x: mx,
          y: my,
          id: best.id,
          name: o?.name || best.id,
          gang: best.gang,
          district: o?.home_district,
        });
      } else setHover(null);
    };
    const onLeave = () => setHover(null);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      sim.stop();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [graph, fragInfo, totalDays, data]);

  const curDate = fmtDate(addDays(data.minDate, Math.round(day)));

  const activeGangs = useMemo(() => {
    const set = new Set();
    for (const l of graph.links)
      if (day >= l.from && day <= l.to) set.add(l.gang);
    return set;
  }, [day, graph]);

  const fragList = data.groundTruth.fragmenting_gangs || [];

  return (
    <div>
      <PageHeader
        eyebrow="Module D"
        title="Network Gravity Simulation"
        concept="Social network analysis"
      >
        A living map of co-offending crews. Drag the timeline and watch cliques
        form and tighten — then, at a fragmentation event, a subset of members
        (<span className="text-white">ringed in white</span>) breaks its ties
        and drifts off to form its own cluster. This is how organised-crime
        networks actually reshape over time.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="card relative overflow-hidden p-0">
          <canvas ref={canvasRef} className="h-[64vh] min-h-[460px] w-full" />
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-ink/70 px-2 py-1">
            <div className="font-mono text-sm text-accent">{curDate}</div>
            <div className="text-[10px] text-slate-500">
              {activeGangs.size} active crews
            </div>
          </div>
          {hover && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-edge bg-ink/95 px-2 py-1 text-xs"
              style={{
                left: Math.min(hover.x + 12, 560),
                top: hover.y + 12,
              }}
            >
              <div className="text-slate-100">{hover.name}</div>
              <div className="text-slate-500">
                {hover.district} · {hover.gang}
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-edge bg-ink/80 px-3 py-2 backdrop-blur">
            <button className="btn w-16" onClick={() => setPlaying((p) => !p)}>
              {playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <input
              type="range"
              min={0}
              max={totalDays}
              value={Math.round(day)}
              onChange={(e) => {
                setPlaying(false);
                const v = Number(e.target.value);
                dayRef.current = v;
                setDay(v);
              }}
              className="flex-1"
            />
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="label">speed</span>
              <input
                type="range"
                min={3}
                max={40}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card p-3">
            <div className="label mb-2">
              Fragmentation events ({fragList.length})
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Jump the clock to just after a crew splinters and watch the
              breakaway group peel away.
            </p>
            <div className="max-h-[38vh] space-y-1.5 overflow-auto pr-1">
              {fragList.map((f) => {
                const fragDay = daysBetween(data.minDate, f.fragment_event_date);
                const on = focusGang === f.gang_id;
                return (
                  <button
                    key={f.gang_id}
                    onClick={() => {
                      setFocusGang(on ? null : f.gang_id);
                      const jump = Math.min(totalDays, fragDay + 12);
                      dayRef.current = jump;
                      setDay(jump);
                      setPlaying(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border p-2 text-left text-xs transition ${
                      on
                        ? "border-accent bg-accent/10"
                        : "border-edge hover:border-accent/50"
                    }`}
                  >
                    <span>
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{
                          background: graph.gangColor.get(f.gang_id),
                        }}
                      />
                      {f.gang_id}
                    </span>
                    <span className="text-slate-500">
                      {f.fragment_event_date} · −{f.breakaway_members.length}
                    </span>
                  </button>
                );
              })}
            </div>
            {focusGang && (
              <button
                className="mt-2 text-xs text-accent hover:underline"
                onClick={() => setFocusGang(null)}
              >
                clear focus
              </button>
            )}
          </div>

          <div className="card p-3 text-xs text-slate-400">
            <div className="label mb-1">Reading the graph</div>
            <ul className="list-disc space-y-1 pl-4">
              <li>Each colour is one gang; dots are offenders.</li>
              <li>Bright dots have an active tie at the current date.</li>
              <li>
                <span className="text-warn">Red ties</span> are cross-group
                bonds that will snap at fragmentation.
              </li>
              <li>White-ringed dots have broken away into a new crew.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
