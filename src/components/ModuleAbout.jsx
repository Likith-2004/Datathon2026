import React, { useState } from "react";

// Collapsible "About this module" explainer. `sections` is an array of
// { h, body } where body may be a string or JSX. Open by default so judges
// read the payoff before touching controls.
export default function ModuleAbout({ sections, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-slate-200">
          About this module — method, how to read it, and what it recovers
        </span>
        <span
          className={`text-slate-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-edge px-4 py-4 md:grid-cols-2 lg:grid-cols-4">
          {sections.map((s, i) => (
            <div key={i}>
              <div className="label mb-1.5 text-accent">{s.h}</div>
              <div className="text-[13px] leading-relaxed text-slate-400">
                {s.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
