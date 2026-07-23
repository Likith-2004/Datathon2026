import React, { useMemo, useState } from "react";
import { useData } from "../data/DataContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import MoGlyph from "../components/MoGlyph.jsx";
import ModuleAbout from "../components/ModuleAbout.jsx";
import { MO_AXES, moSimilarity } from "../lib/mo.js";

const MATCH_THRESHOLD = 0.8;

export default function MoFingerprint() {
  const { data } = useData();
  const offenders = data.offenders;

  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");

  // ground-truth ring lookup: record_id -> {trueId, all}
  const ringByRecord = useMemo(() => {
    const m = new Map();
    for (const ring of data.groundTruth.serial_offender_ring) {
      for (const rec of ring.all_records)
        m.set(rec, { trueId: ring.true_identity, all: ring.all_records });
    }
    return m;
  }, [data]);

  const selected = selectedId ? data.offenderById.get(selectedId) : null;

  // similarity-ranked list when something is selected
  const ranked = useMemo(() => {
    if (!selected) return null;
    return offenders
      .filter((o) => o.offender_id !== selected.offender_id)
      .map((o) => ({ o, sim: moSimilarity(selected, o) }))
      .sort((a, b) => b.sim - a.sim);
  }, [selected, offenders]);

  const matches = useMemo(
    () => (ranked ? ranked.filter((r) => r.sim >= MATCH_THRESHOLD).slice(0, 12) : []),
    [ranked]
  );

  // grid ordering: selected first, then by similarity if selection active
  const grid = useMemo(() => {
    let list = offenders;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.offender_id.toLowerCase().includes(q) ||
          o.home_district.toLowerCase().includes(q)
      );
    }
    if (selected) {
      const simOf = new Map(ranked.map((r) => [r.o.offender_id, r.sim]));
      list = [...list].sort((a, b) => {
        if (a.offender_id === selected.offender_id) return -1;
        if (b.offender_id === selected.offender_id) return 1;
        return (simOf.get(b.offender_id) || 0) - (simOf.get(a.offender_id) || 0);
      });
    }
    return list.slice(0, 300);
  }, [offenders, query, selected, ranked]);

  const simOf = useMemo(
    () => (ranked ? new Map(ranked.map((r) => [r.o.offender_id, r.sim])) : null),
    [ranked]
  );

  const ringCores = data.groundTruth.serial_offender_ring.map((r) => r.true_identity);

  // does the current selection's match set recover its planted aliases?
  const recovery = useMemo(() => {
    if (!selected) return null;
    const info = ringByRecord.get(selected.offender_id);
    if (!info) return null;
    const expected = info.all.filter((id) => id !== selected.offender_id);
    const found = matches.map((m) => m.o.offender_id);
    const recovered = expected.filter((id) => found.includes(id));
    return { expected, recovered };
  }, [selected, matches, ringByRecord]);

  return (
    <div>
      <PageHeader
        eyebrow="Module B"
        title="MO Fingerprint Radar & Matching"
        concept="Behavioural linkage analysis"
      >
        Every offender's method of operation becomes a 5-spoke fingerprint.
        Click any glyph to rank all others by how closely their MO matches — the
        way analysts link crimes to a single hand. Offenders with near-identical
        fingerprints but different names and home districts are flagged as{" "}
        <b className="text-slate-200">possibly the same individual</b>.
      </PageHeader>

      <ModuleAbout
        sections={[
          {
            h: "The method",
            body: (
              <>
                <b className="text-slate-200">Behavioural linkage analysis</b> —
                linking separate offences to one offender by the consistency of
                their method rather than by ID. Real investigators use it to tie
                together a serial's crimes; here each offender's MO is reduced to
                five categorical axes (transport, entry, weapon, target, time
                band).
              </>
            ),
          },
          {
            h: "How to read it",
            body: (
              <>
                Each glyph is one offender's fingerprint: a spoke per axis, its
                length set by the value on that axis, so the polygon's{" "}
                <b className="text-slate-200">shape is the signature</b>. Colour
                is hashed from the full MO vector, so two offenders using the
                same method look like <b className="text-slate-200">twins</b> —
                same shape, same hue.
              </>
            ),
          },
          {
            h: "How matching works",
            body: (
              <>
                Click a glyph and every other offender is scored by{" "}
                <b className="text-slate-200">weighted categorical similarity</b>{" "}
                (weapon and target count most — they're the strongest identity
                cues). The grid re-sorts by match, and anyone above{" "}
                {(MATCH_THRESHOLD * 100).toFixed(0)}% is flagged as a possible
                shared identity.
              </>
            ),
          },
          {
            h: "The payoff",
            body: (
              <>
                Click a <span className="text-warn">red-chip serial offender</span>{" "}
                below. Its two aliases — different names, different home districts
                (shown in <span className="text-gold">gold</span>) — jump to the
                top of the ranking. The panel cross-checks each against the hidden
                ground truth and confirms <b className="text-slate-200">✓ same
                person</b>. That cross-district link is the platform's core aha.
              </>
            ),
          },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search name / ID / district…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {selected && (
          <button className="btn" onClick={() => setSelectedId(null)}>
            clear selection
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">
          Try a hidden serial offender:
        </span>
        {ringCores.map((id) => (
          <button
            key={id}
            className="chip cursor-pointer border-warn/40 text-warn hover:bg-warn/10"
            onClick={() => setSelectedId(id)}
          >
            {data.offenderById.get(id)?.name || id}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Glyph grid */}
        <div className="card p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="label">
              {selected
                ? "Sorted by MO similarity to selection"
                : `All offenders (${offenders.length}) — showing first 300`}
            </div>
            <div className="label">click a glyph</div>
          </div>
          <div className="grid max-h-[64vh] grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1.5 overflow-auto pr-1">
            {grid.map((o) => {
              const isSel = selected && o.offender_id === selected.offender_id;
              const sim = simOf?.get(o.offender_id);
              const isMatch = sim >= MATCH_THRESHOLD;
              return (
                <button
                  key={o.offender_id}
                  onClick={() => setSelectedId(o.offender_id)}
                  title={`${o.name} · ${o.home_district}${
                    sim != null ? ` · ${(sim * 100).toFixed(0)}% match` : ""
                  }`}
                  className={`relative rounded-lg border p-1 transition ${
                    isSel
                      ? "border-accent bg-accent/10"
                      : isMatch
                      ? "border-warn/70 bg-warn/5"
                      : "border-transparent hover:border-edge"
                  }`}
                >
                  <MoGlyph offender={o} size={68} emphasize={isSel} />
                  {sim != null && (
                    <span
                      className={`absolute right-0.5 top-0.5 rounded px-1 text-[9px] font-mono ${
                        isMatch ? "bg-warn text-white" : "bg-ink/70 text-slate-400"
                      }`}
                    >
                      {(sim * 100).toFixed(0)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail / matches panel */}
        <div className="space-y-3">
          {!selected ? (
            <div className="card p-4 text-sm text-slate-400">
              <div className="label mb-2">How to read a fingerprint</div>
              <div className="mb-3 flex justify-center">
                <MoGlyph offender={offenders[0]} size={150} showAxes />
              </div>
              Each spoke is one behavioural axis (transport, entry method,
              weapon, target, time band). The polygon's shape is the offender's
              signature. Two offenders with the same shape used the same method —
              a strong hint they're the same person. Pick a red-chip serial
              offender above to see the platform recover its aliases.
            </div>
          ) : (
            <>
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <MoGlyph offender={selected} size={92} emphasize />
                  <div>
                    <div className="text-base font-semibold">{selected.name}</div>
                    <div className="font-mono text-xs text-slate-500">
                      {selected.offender_id}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Home: {selected.home_district}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-1 text-xs">
                  {MO_AXES.map((a) => (
                    <div
                      key={a.key}
                      className="flex justify-between border-b border-edge/60 py-0.5"
                    >
                      <span className="text-slate-500">{a.label}</span>
                      <span className="text-slate-200">{selected[a.key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {recovery && (
                <div
                  className={`card border-warn/40 bg-warn/5 p-3 text-xs ${
                    recovery.recovered.length === recovery.expected.length
                      ? ""
                      : ""
                  }`}
                >
                  <div className="mb-1 font-semibold text-warn">
                    Ground-truth check
                  </div>
                  This offender is a planted serial-ring member with{" "}
                  {recovery.expected.length} hidden alias
                  {recovery.expected.length > 1 ? "es" : ""}. The MO matcher
                  recovered{" "}
                  <b className="text-white">
                    {recovery.recovered.length}/{recovery.expected.length}
                  </b>{" "}
                  of them in the top matches below. ✓
                </div>
              )}

              <div className="card p-3">
                <div className="label mb-2">
                  Possible same individual · ≥ {(MATCH_THRESHOLD * 100).toFixed(0)}%
                  MO match
                </div>
                {matches.length === 0 && (
                  <div className="text-sm text-slate-500">
                    No offenders above the match threshold — MO looks unique.
                  </div>
                )}
                <div className="space-y-1.5">
                  {matches.map(({ o, sim }) => {
                    const ring = ringByRecord.get(o.offender_id);
                    const confirmed =
                      ring && ring.trueId === ringByRecord.get(selected.offender_id)?.trueId;
                    const diffDistrict = o.home_district !== selected.home_district;
                    return (
                      <button
                        key={o.offender_id}
                        onClick={() => setSelectedId(o.offender_id)}
                        className="flex w-full items-center gap-2 rounded-lg border border-edge bg-ink/40 p-2 text-left transition hover:border-accent/50"
                      >
                        <MoGlyph offender={o} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-slate-100">
                            {o.name}
                          </div>
                          <div className="truncate text-[11px] text-slate-500">
                            {o.offender_id} ·{" "}
                            <span className={diffDistrict ? "text-gold" : ""}>
                              {o.home_district}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm text-warn">
                            {(sim * 100).toFixed(0)}%
                          </div>
                          {confirmed && (
                            <div className="text-[9px] font-semibold text-accent">
                              ✓ same person
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {matches.some(
                  (m) => m.o.home_district !== selected.home_district
                ) && (
                  <p className="mt-2 text-[11px] text-gold">
                    Gold districts differ from the selection's home district —
                    the same MO surfacing across jurisdictions is exactly what a
                    cross-district alias looks like.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
