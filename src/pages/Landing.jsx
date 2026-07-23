import React from "react";
import { Link } from "react-router-dom";
import { useData } from "../data/DataContext.jsx";

const MODULES = [
  {
    to: "/space-time-cube",
    tag: "A",
    title: "Space-Time Cube",
    concept: "Time geography (Hägerstrand)",
    payoff:
      "Stacks a district's incidents into a rotatable 3D block where height is time. A repeat offender's crimes line up into a diagonal trail you can literally see climbing through the weeks — impossible to spot on a flat map.",
    color: "from-accent/20 to-transparent",
  },
  {
    to: "/mo-fingerprint",
    tag: "B",
    title: "MO Fingerprint Radar",
    concept: "Behavioural linkage analysis",
    payoff:
      "Turns each offender's method-of-operation into a 5-spoke 'fingerprint' glyph. Click one and the platform ranks everyone else by similarity — surfacing offenders operating under different names in different districts who are almost certainly the same person.",
    color: "from-accent2/20 to-transparent",
  },
  {
    to: "/ripple-map",
    tag: "C",
    title: "Near-Repeat Ripple Map",
    concept: "Near-repeat victimisation",
    payoff:
      "Plays the year forward on a district map. When a break-in happens, a risk 'ripple' expands around it — and you watch follow-up crimes land inside that ripple days later, the signature of contagious burglary that predictive policing exploits.",
    color: "from-warn/20 to-transparent",
  },
  {
    to: "/network-gravity",
    tag: "D",
    title: "Network Gravity",
    concept: "Social network analysis of gangs",
    payoff:
      "A living force-graph of co-offending gangs. Drag the timeline and cliques form, tighten, then visibly split as a member breaks away to start their own crew — the exact moment organised-crime networks fragment.",
    color: "from-gold/20 to-transparent",
  },
  {
    to: "/anomaly-bloom",
    tag: "E",
    title: "Anomaly Bloom Glyphs",
    concept: "Statistical anomaly detection",
    payoff:
      "Every station-week is drawn as a small flower whose petals are its crime metrics vs its own 8-week baseline. Normal weeks are round and calm; a genuine crime spike erupts as a lopsided spike you catch at a glance across hundreds of weeks.",
    color: "from-[#57d97b]/20 to-transparent",
  },
];

function Stat({ label, value }) {
  return (
    <div className="card px-4 py-3">
      <div className="font-mono text-lg font-semibold text-accent">{value}</div>
      <div className="label mt-0.5">{label}</div>
    </div>
  );
}

export default function Landing() {
  const { data } = useData();
  const counts = data?.groundTruth?.row_counts || {};
  const fmt = (n) => (n ? n.toLocaleString() : "—");

  return (
    <div>
      <section className="mb-8 mt-2">
        <div className="chip mb-3 inline-flex border-accent/40 text-accent">
          AI-driven crime pattern discovery
        </div>
        <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          Five ways to <span className="text-accent">see</span> a crime pattern
          that a table would hide.
        </h1>
        <p className="mt-4 max-w-3xl text-slate-400">
          A crime-intelligence workbench for Karnataka built on a fully
          synthetic case archive. Each module targets one real criminological
          method — behavioural linkage, near-repeat contagion, network analysis,
          time-geography and anomaly detection — and is engineered to{" "}
          <em className="text-slate-200">recover a pattern we deliberately hid</em>{" "}
          in the data. Open any module to watch it find it.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Incidents" value={fmt(counts.incidents)} />
          <Stat label="Offenders" value={fmt(counts.offenders)} />
          <Stat label="Districts" value={fmt(counts.districts)} />
          <Stat label="Police stations" value={fmt(counts.police_stations)} />
          <Stat label="Network edges" value={fmt(counts.network_edges)} />
          <Stat label="Years covered" value="2023–25" />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          How to read this platform
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              n: "1",
              h: "Every module = one real method",
              b: "Not five views of the same heatmap. Each module implements a distinct, established crime-analysis technique — time geography, behavioural linkage, near-repeat contagion, network analysis, anomaly detection — chosen because each surfaces a pattern the others can't.",
            },
            {
              n: "2",
              h: "The data hides known answers",
              b: "A Python generator builds ~46k synthetic incidents and deliberately plants ground truth inside them: a serial ring with cross-district aliases, contagion chains, true anomaly weeks, and gangs that fragment. It's all recorded in ground_truth.json.",
            },
            {
              n: "3",
              h: "Each page proves it recovered them",
              b: "Because the answers are known, every module can be scored — and each shows that check live on-screen (\"recovered 2/2 aliases\", \"flags 4/4 anomalies\"). That's the line between a cool visual and defensible analytics.",
            },
          ].map((s) => (
            <div key={s.n} className="card p-4">
              <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg border border-edge bg-ink font-mono text-sm font-bold text-accent">
                {s.n}
              </div>
              <h3 className="text-sm font-semibold text-slate-200">{s.h}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
                {s.b}
              </p>
            </div>
          ))}
        </div>
      </section>

      <h2 className="mb-3 text-lg font-semibold tracking-tight">
        The five modules
      </h2>
      <section className="grid gap-4 md:grid-cols-2">
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="card group relative overflow-hidden p-5 transition hover:border-accent/50"
          >
            <div
              className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${m.color} blur-2xl`}
            />
            <div className="relative flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-edge bg-ink font-mono text-sm font-bold text-accent">
                {m.tag}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{m.title}</h3>
                  <span className="chip border-accent2/30 text-accent2">
                    {m.concept}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {m.payoff}
                </p>
                <div className="mt-3 text-sm font-medium text-accent opacity-0 transition group-hover:opacity-100">
                  Open module →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="card mt-6 p-5">
        <h3 className="text-sm font-semibold text-slate-200">
          Why this isn't just a dashboard
        </h3>
        <p className="mt-1.5 max-w-4xl text-sm text-slate-400">
          Anyone can plot crime on a heatmap. The harder question is{" "}
          <em className="text-slate-200">whether the visual actually reveals structure</em>.
          So the synthetic generator injects known ground truth — a hidden
          serial-offender ring with aliases, near-repeat contagion chains, true
          anomaly weeks, and gangs that fragment over time — and every module is
          scored on whether it recovers it. Each page shows that recovery live.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Hidden serial ring", "5 offenders, each with 2 aliases in other districts sharing a near-identical MO", "→ MO Fingerprint"],
            ["Near-repeat contagion", "property crimes seed 1–4 nearby follow-ons within ~10 days, decaying per generation", "→ Ripple Map"],
            ["Structural hotspots", "~11 stations carry permanently elevated risk, not lucky random runs", "→ Ripple & Bloom"],
            ["True anomaly weeks", "4 real single-crime-type spikes at hotspots, well above their own baseline", "→ Anomaly Bloom"],
            ["Gang fragmentation", "14 crews split partway through their run; who left and when is recorded", "→ Network Gravity"],
            ["Socio-economic signal", "cyber/fraud skew urban; domestic violence/narcotics skew rural — with noise", "→ across modules"],
          ].map(([h, b, tag]) => (
            <div
              key={h}
              className="rounded-lg border border-edge bg-ink/40 p-3"
            >
              <div className="text-[13px] font-semibold text-slate-200">{h}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                {b}
              </div>
              <div className="mt-1 text-[11px] font-medium text-accent">{tag}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
