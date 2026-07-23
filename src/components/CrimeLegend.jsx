import React from "react";
import { crimeColor } from "../lib/util.js";

export default function CrimeLegend({ types, active, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((t) => {
        const on = !active || active.has(t);
        return (
          <button
            key={t}
            onClick={() => onToggle && onToggle(t)}
            className={`chip inline-flex items-center gap-1.5 transition ${
              onToggle ? "cursor-pointer hover:border-accent/50" : ""
            } ${on ? "" : "opacity-35"}`}
            title={t}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: crimeColor(t) }}
            />
            {t}
          </button>
        );
      })}
    </div>
  );
}
