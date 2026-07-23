import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useData } from "../data/DataContext.jsx";
import Footer from "./Footer.jsx";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/space-time-cube", label: "Space-Time Cube" },
  { to: "/mo-fingerprint", label: "MO Fingerprint" },
  { to: "/ripple-map", label: "Near-Repeat Ripple" },
  { to: "/network-gravity", label: "Network Gravity" },
  { to: "/anomaly-bloom", label: "Anomaly Bloom" },
];

function Loading({ progress }) {
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4">
      <div className="text-sm text-slate-400">
        Loading synthetic case files…
      </div>
      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-edge">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <div className="font-mono text-xs text-slate-500">
        {Math.round(progress * 100)}%
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const { loading, error, progress } = useData();
  const loc = useLocation();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-edge bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-4 py-2.5">
          <Link to="/" className="mr-4 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-accent2 text-[13px] font-black text-ink">
              K
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Karnataka Crime Intelligence
            </span>
          </Link>
          <nav className="hidden flex-wrap gap-1 md:flex">
            {NAV.slice(1).map((n) => {
              const active = loc.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-md px-2.5 py-1 text-[13px] transition ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <span className="ml-auto chip hidden sm:inline-flex">
            Synthetic demo · 2023–2025
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5">
        {error ? (
          <div className="card mx-auto mt-16 max-w-lg p-6 text-center">
            <div className="mb-2 text-warn">Failed to load data</div>
            <div className="text-sm text-slate-400">{error}</div>
            <div className="mt-4 text-xs text-slate-500">
              Run <code className="text-accent">python generate_data.py</code>{" "}
              then restart the dev server.
            </div>
          </div>
        ) : loading ? (
          <Loading progress={progress} />
        ) : (
          children
        )}
      </main>

      <Footer />
    </div>
  );
}
