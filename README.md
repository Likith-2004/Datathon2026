# Karnataka Crime Intelligence & Visualization Platform

An AI-driven crime-analytics workbench for Karnataka, built on a **fully
synthetic** case archive. It is deliberately *not* a generic dashboard. Each of
its five modules implements one real criminological method and is engineered to
**recover a pattern that was deliberately hidden in the data** — and every page
shows that recovery live, validated against a machine-readable ground truth.

> ⚠️ **Synthetic demo data — not real crime records.** District names and
> geography are real (for realism); every person, incident, gang, and statistic
> is fictional and machine-generated. Nothing here describes real events or
> people. A disclaimer to this effect appears in the footer of every page.

---

## How to run

Requirements: **Python 3.9+** and **Node 18+**.

```bash
# 1. Generate the synthetic dataset into ./data  (writes CSV + ground_truth.json)
pip install -r requirements.txt
python generate_data.py

# 2. Install and launch the web app
npm install
npm run dev
```

Then open the URL Vite prints (default <http://localhost:5173>).

`npm run dev` automatically copies `./data` into `./public/data` (via
`scripts/prepare-data.mjs`) so the browser can fetch it — you do **not** need to
copy anything by hand. `npm run build` + `npm run preview` produce/serve a
static production build the same way.

If a page shows "Failed to load data", you skipped step 1 — run
`python generate_data.py` and restart the dev server.

> **Note on the dataset.** The generated CSVs are **not committed to this
> repository** (they're ~11 MB of derived, fully synthetic data). Regenerate
> them in one command with `python generate_data.py`, then run `npm run dev`.

---

## Deployment (Vercel)

This is a static Vite build, deployable on Vercel with zero config beyond the
included `vercel.json`. Because the dataset is not in git, the build **regenerates
it on Vercel** — `vercel.json` sets:

```
pip3 install --quiet numpy pandas faker && python3 generate_data.py && npm run build
```

so `data/` is recreated (deterministically, fixed seed) and copied into the
static output on every deploy. To deploy: push this repo to GitHub, then import
it at [vercel.com/new](https://vercel.com/new) — Vercel auto-detects Vite and
uses the build command above. Routing uses `HashRouter`, so no SPA rewrite rules
are needed.

---

## What's in `/data`

`generate_data.py` produces a self-consistent synthetic archive (~46k incidents,
2023–2025) and an auditable record of everything it planted:

| File | Rows | Contents |
|------|------|----------|
| `districts.csv` | 30 | Real Karnataka districts w/ centroid, population, urbanization, literacy, unemployment, composite `socio_econ_index` |
| `police_stations.csv` | ~122 | 3–6 stations per district, jittered around the centroid |
| `offenders.csv` | 660 | Offenders + a 5-axis MO vector (transport, entry, weapon, target, time band); alias records flagged with `true_identity_id` |
| `victims.csv` | 2,400 | Synthetic victims |
| `incidents.csv` | ~46k | date/time/lat-lon/crime_type/severity/MO/offender/victim/status + `near_repeat_seed`, `near_repeat_generation` |
| `network_edges.csv` | ~34k | Co-offending edges (grouped into 22 gangs with `active_from/active_to/fragment_event_date`) + offender→victim edges |
| `weekly_station_stats.csv` | ~16k | case_count, avg_severity, avg_response_time_min per station per week |
| `ground_truth.json` | — | Every injected pattern, for validation |

### Deliberately injected ground truth

The data is **not** random noise — the point is that the visualizations reveal
real structure. `ground_truth.json` documents each planted pattern:

1. **Hidden serial-offender ring** — 5 core offenders, each with 2 alias records
   in *other* districts sharing a near-identical MO. (→ Module B)
2. **~11 structural hotspot stations** — permanently higher incident weight.
   (→ Modules C & E)
3. **Near-repeat contagion** — property crimes seed short bursts of nearby
   follow-ons within ~10 days, with decaying probability per generation, tagged
   via `near_repeat_seed`/`near_repeat_generation`. (→ Module C)
4. **4 true anomaly weeks** — a real single-crime-type spike (8–14 extra
   incidents) at a hotspot, well above its normal range. (→ Module E)
5. **Gang fragmentation** — 14 gangs split partway through their active window;
   `fragment_event_date` + `breakaway_members` record who left and when.
   (→ Module D)
6. **Socio-economic correlation** — cyber/fraud skew urban; domestic
   violence/narcotics skew rural/low-urbanization — with real noise.

---

## The five modules

Each is its own route, linked from the landing page.

### A · Space-Time Cube — *time geography (Hägerstrand)*
A rotatable 3D block where the floor is the map (where) and the vertical axis is
time (when). Every incident in a district is a point. Orbit to find **vertical
columns** (a chronic hotspot) and **diagonal streaks** (activity drifting over
time). Filter by crime type, highlight one offender's incidents as a connected
**trail through time**, and hit **Flatten** to collapse the cube back into an
ordinary 2D map — the before/after that makes the metaphor click.
*Built with Three.js / react-three-fiber.*

### B · MO Fingerprint Radar & Matching — *behavioural linkage analysis*
Every offender's modus operandi becomes a 5-spoke radar **fingerprint** glyph;
the whole population is shown as small multiples. Click a glyph and the platform
ranks everyone else by **weighted categorical MO similarity**, surfacing a
"Possible same individual" panel. **The payoff:** clicking a hidden serial
offender pulls its aliases — operating under different names in different
districts — to the very top, and the panel cross-checks each against the ground
truth (✓ *same person*). The recovery counter shows e.g. *recovered 2/2*.

### C · Near-Repeat Ripple Map — *near-repeat victimisation*
An offline canvas map of a district with play/pause/scrub over the full date
range. When a **seed** property crime occurs, an expanding, fading **risk
ripple** blooms from its location; **follow-on crimes land inside the still-
expanding ring** days later — the near-repeat signature. Toggle "contagion only"
vs "all incidents" to see the pattern pop out of the background noise.
*(Uses an offline projected canvas — no map-tile keys or internet required.)*

### D · Network Gravity Simulation — *social network analysis of organised crime*
A live D3 **force-directed** graph of co-offending crews driven by a **timeline
scrubber**. As time advances, ties fade in/out by each gang's
`active_from/active_to`; at a `fragment_event_date`, the breakaway members
(ringed in white) release from their old cluster and drift into a new one. Jump
to any of the recorded fragmentation events to watch a crew splinter in real
time. Not a static snapshot — the temporal reshaping *is* the deliverable.

### E · Anomaly Bloom Glyphs — *statistical anomaly detection*
Each station-week is drawn as a small **flower** whose petals encode case count,
category surge, mix shift, severity, and response time **relative to that
station's own trailing 8-week baseline**. Calm weeks are small and round; a real
spike **erupts into a lopsided flare** you spot without reading numbers. Click
any bloom for the raw numbers and per-metric deviation (z-scores). A purely
statistical **"detected anomalies" leaderboard** — which never saw the ground
truth — ranks the injected anomaly weeks at the top (tagged *planted*), and the
recovery banner reports *flags 4/4 of them*.

---

## Why this is defensible analytics, not just pretty pictures

Each module is grounded in an established method used in real crime analysis:

- **Near-repeat victimisation** (Townsley, Johnson, Bowers) — the empirical
  finding that a burglary elevates short-term risk for nearby homes; the basis
  of predictive-policing tools like PredPol. → Module C
- **Risk terrain / structural hotspots** (Caplan & Kennedy) — some places carry
  persistently elevated risk from stable features, distinct from random runs.
  → Modules C & E
- **Behavioural / MO linkage analysis** — linking offences to a common offender
  by consistency of method; used in serial-crime investigation. → Module B
- **Social network analysis of co-offending** (Morselli) — organised crime as an
  evolving network that forms, tightens, and fragments. → Module D
- **Time geography** (Hägerstrand's space-time aquarium) — representing paths
  through space *and* time to expose structure a flat map hides. → Module A
- **Statistical anomaly detection** — baseline-relative deviation to separate
  genuine spikes from routine variation. → Module E

Because the generator plants known ground truth, each module can be *scored* on
whether it recovers it — which is exactly what the on-page recovery indicators
demonstrate.

---

## Notes & scope

- **Nothing was silently dropped.** All five modules are fully implemented with
  the specific interaction described (3D orbit + flatten, similarity ranking,
  ripple playback, temporal force-graph with fragmentation, baseline-relative
  bloom glyphs).
- **Maps are offline by design.** Modules C uses a projected canvas basemap
  rather than external raster tiles, so the demo runs with no API keys and no
  internet.
- **Performance.** The 3D cube renders one district at a time (typically a few
  thousand points). The network graph renders the co-offending sub-network
  (offender→victim edges are excluded from the force layout for clarity). These
  are deliberate scoping choices for smooth interaction, not missing features.
- Built with **React + Vite + Tailwind**, **Three.js / react-three-fiber**
  (Module A), **D3-force** (Module D), and **HTML canvas / SVG** for the
  bespoke glyph and map visualizations.

## Project layout

```
generate_data.py        # synthetic data generator (writes ./data)
requirements.txt        # Python deps for the generator
data/                   # generated CSV + ground_truth.json
scripts/prepare-data.mjs# copies data/ -> public/data before dev/build
src/
  data/DataContext.jsx  # loads + indexes all CSVs once
  lib/                  # MO similarity, projection, date/color helpers
  components/           # AppShell, glyphs (MO radar, anomaly bloom), legend, footer
  pages/                # Landing + one file per module (A–E)
```
