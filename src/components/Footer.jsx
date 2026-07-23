import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-edge bg-ink/60">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 py-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-warn" />
          <strong className="text-slate-400">Synthetic demo data</strong> — not
          real crime records. District names/geography are real; every person,
          incident and statistic is fictional and machine-generated.
        </span>
        <span>Karnataka Crime Intelligence Platform · hackathon demo</span>
      </div>
    </footer>
  );
}
