import React from "react";
import { Link } from "react-router-dom";

export default function PageHeader({ eyebrow, title, children, concept }) {
  return (
    <div className="mb-4">
      <Link
        to="/"
        className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-accent"
      >
        ← All modules
      </Link>
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow && <div className="label mb-1">{eyebrow}</div>}
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            {title}
          </h1>
          {children && (
            <p className="mt-1 max-w-3xl text-sm text-slate-400">{children}</p>
          )}
        </div>
        {concept && (
          <span className="chip shrink-0 border-accent2/40 text-accent2">
            {concept}
          </span>
        )}
      </div>
    </div>
  );
}
