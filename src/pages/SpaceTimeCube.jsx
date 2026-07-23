import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useData } from "../data/DataContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { crimeColor, makeProjector, parseDate, weekIndex } from "../lib/util.js";
import ModuleAbout from "../components/ModuleAbout.jsx";

const SPAN = 10; // horizontal extent of the map footprint
const HEIGHT = 12; // vertical extent = time axis

function useDistrictScene(districtIncidents, minDate, activeTypes, offenderId) {
  return useMemo(() => {
    if (!districtIncidents || !districtIncidents.length) return null;
    const proj = makeProjector(districtIncidents, 0.06);
    const weeks = districtIncidents.map((i) => weekIndex(i.date, minDate));
    const maxWeek = Math.max(1, ...weeks);

    const toPos = (inc) => {
      const w = weekIndex(inc.date, minDate);
      return [
        (proj.x(inc.longitude) - 0.5) * SPAN,
        (w / maxWeek) * HEIGHT,
        (proj.y(inc.latitude) - 0.5) * SPAN,
      ];
    };

    const shown = districtIncidents.filter(
      (i) => !activeTypes || activeTypes.has(i.crime_type)
    );

    const positions = new Float32Array(shown.length * 3);
    const colors = new Float32Array(shown.length * 3);
    const c = new THREE.Color();
    shown.forEach((inc, i) => {
      const [x, y, z] = toPos(inc);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      c.set(crimeColor(inc.crime_type));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });

    // offender trail (sorted by time)
    let trail = null;
    if (offenderId) {
      const pts = districtIncidents
        .filter((i) => i.offender_id === offenderId)
        .sort((a, b) => parseDate(a.date) - parseDate(b.date))
        .map((i) => new THREE.Vector3(...toPos(i)));
      if (pts.length) trail = pts;
    }

    // year tick marks on the time axis
    const ticks = [];
    const startYear = parseDate(minDate).getUTCFullYear();
    for (let w = 0; w <= maxWeek; w++) {
      const dt = parseDate(minDate);
      dt.setUTCDate(dt.getUTCDate() + w * 7);
      if (dt.getUTCDate() <= 7 && dt.getUTCMonth() === 0) {
        ticks.push({ y: (w / maxWeek) * HEIGHT, label: `${dt.getUTCFullYear()}` });
      }
    }
    if (!ticks.length) ticks.push({ y: 0, label: `${startYear}` });

    return { positions, colors, count: shown.length, trail, maxWeek };
  }, [districtIncidents, minDate, activeTypes, offenderId]);
}

function PointCloud({ scene, flat, dim }) {
  const geomRef = useRef();
  const groupRef = useRef();
  const cur = useRef(1);

  useFrame(() => {
    const target = flat ? 0.001 : 1;
    cur.current += (target - cur.current) * 0.12;
    if (groupRef.current) groupRef.current.scale.y = cur.current;
  });

  return (
    <group ref={groupRef}>
      <points key={scene.count}>
        <bufferGeometry ref={geomRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[scene.positions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[scene.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={0.11}
          sizeAttenuation
          transparent
          opacity={dim ? 0.28 : 0.92}
          depthWrite={false}
        />
      </points>

      {scene.trail && (
        <>
          <Line points={scene.trail} color="#ffffff" lineWidth={2} transparent opacity={0.9} />
          <points>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array(scene.trail.flatMap((v) => [v.x, v.y, v.z])),
                  3,
                ]}
              />
            </bufferGeometry>
            <pointsMaterial
              color="#ffffff"
              size={0.32}
              sizeAttenuation
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </points>
        </>
      )}
    </group>
  );
}

function Frame({ flat, ticks }) {
  // footprint square + vertical time posts + year labels
  const half = SPAN / 2;
  const base = [
    [-half, 0, -half],
    [half, 0, -half],
    [half, 0, half],
    [-half, 0, half],
    [-half, 0, -half],
  ].map((p) => new THREE.Vector3(...p));
  const posts = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  return (
    <group>
      <gridHelper
        args={[SPAN, 12, "#2a3450", "#182036"]}
        position={[0, 0, 0]}
      />
      <Line points={base} color="#39527a" lineWidth={1} />
      {!flat &&
        posts.map((p, i) => (
          <Line
            key={i}
            points={[
              new THREE.Vector3(p[0], 0, p[1]),
              new THREE.Vector3(p[0], HEIGHT, p[1]),
            ]}
            color="#243350"
            lineWidth={1}
          />
        ))}
      {!flat &&
        ticks.map((t, i) => (
          <group key={i} position={[-half - 0.2, t.y, -half]}>
            <Line
              points={[
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(SPAN + 0.4, 0, 0),
              ]}
              color="#1b2136"
              lineWidth={1}
            />
            <Html center position={[-0.6, 0, 0]} distanceFactor={18}>
              <div className="select-none rounded bg-ink/70 px-1 text-[10px] font-mono text-slate-400">
                {t.label}
              </div>
            </Html>
          </group>
        ))}
    </group>
  );
}

function Scene({ scene, flat, dim, ticks }) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <group position={[0, -HEIGHT / 2, 0]}>
        <Frame flat={flat} ticks={ticks} />
        <PointCloud scene={scene} flat={flat} dim={dim} />
      </group>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        maxDistance={45}
        minDistance={6}
      />
    </>
  );
}

export default function SpaceTimeCube() {
  const { data } = useData();
  const districts = useMemo(
    () =>
      [...data.districts].sort(
        (a, b) =>
          (data.incidentsByDistrict.get(b.district)?.length || 0) -
          (data.incidentsByDistrict.get(a.district)?.length || 0)
      ),
    [data]
  );
  const [district, setDistrict] = useState(districts[0].district);
  const [activeTypes, setActiveTypes] = useState(null); // null = all
  const [offenderId, setOffenderId] = useState("");
  const [flat, setFlat] = useState(false);

  const districtIncidents = data.incidentsByDistrict.get(district) || [];

  // year ticks
  const ticks = useMemo(() => {
    const weeks = districtIncidents.map((i) => weekIndex(i.date, data.minDate));
    const maxWeek = Math.max(1, ...weeks);
    const out = [];
    for (let w = 0; w <= maxWeek; w++) {
      const dt = parseDate(data.minDate);
      dt.setUTCDate(dt.getUTCDate() + w * 7);
      if (dt.getUTCMonth() === 0 && dt.getUTCDate() <= 7)
        out.push({ y: (w / maxWeek) * HEIGHT, label: `${dt.getUTCFullYear()}` });
    }
    return out;
  }, [districtIncidents, data.minDate]);

  const scene = useDistrictScene(
    districtIncidents,
    data.minDate,
    activeTypes,
    offenderId
  );

  // offenders active in this district, ranked by # incidents here
  const offenderOptions = useMemo(() => {
    const counts = new Map();
    for (const i of districtIncidents) {
      if (i.offender_id)
        counts.set(i.offender_id, (counts.get(i.offender_id) || 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([id, n]) => {
        const o = data.offenderById.get(id);
        return { id, n, name: o?.name || id };
      });
  }, [districtIncidents, data]);

  const types = data.crimeTypes;
  const toggleType = (t) => {
    setActiveTypes((prev) => {
      const next = new Set(prev || types);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      if (next.size === types.length) return null;
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Module A"
        title="Space-Time Cube"
        concept="Time geography · Hägerstrand"
      >
        Each dot is one incident inside <b className="text-slate-200">{district}</b>.
        The floor is the map (where); the vertical axis is time (when). Orbit the
        cube to find diagonal streaks — the same place lighting up week after
        week, or one offender's crimes climbing through the year.
      </PageHeader>

      <ModuleAbout
        sections={[
          {
            h: "The method",
            body: (
              <>
                <b className="text-slate-200">Time geography</b>, from Torsten
                Hägerstrand's 1970 "space-time aquarium." A flat map answers{" "}
                <em>where</em>; a timeline answers <em>when</em>. Plotting both at
                once — two axes for geography, one vertical axis for time —
                exposes structure that vanishes the moment you flatten time onto
                a single map.
              </>
            ),
          },
          {
            h: "How to read it",
            body: (
              <>
                The floor is the district map. Height is time: the base is Jan
                2023, the top is Dec 2025, one step per week. A{" "}
                <b className="text-slate-200">vertical column</b> of dots is one
                place hit over and over — a chronic hotspot. A{" "}
                <b className="text-slate-200">diagonal streak</b> is activity
                drifting across space over time. Scattered dots are noise.
              </>
            ),
          },
          {
            h: "What it recovers",
            body: (
              <>
                Pick a repeat offender and their incidents light up as a white{" "}
                <b className="text-slate-200">trail</b> threaded in time order.
                The trail's slope shows how fast they move between locations — a
                signature you cannot draw on a 2D map, where those points would
                pile onto the same few streets.
              </>
            ),
          },
          {
            h: "Try this",
            body: (
              <>
                Rotate to look straight down — that's an ordinary hotspot map.
                Tilt back up and the dots separate by week. Then hit{" "}
                <b className="text-slate-200">Flatten</b> to animate between the
                two: that morph is the entire argument for time geography in one
                gesture.
              </>
            ),
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Controls */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="label mb-1">District</div>
            <select
              className="input"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setOffenderId("");
              }}
            >
              {districts.map((d) => (
                <option key={d.district} value={d.district}>
                  {d.district} ({data.incidentsByDistrict.get(d.district)?.length || 0})
                </option>
              ))}
            </select>

            <div className="label mb-1 mt-3">Highlight offender trail</div>
            <select
              className="input"
              value={offenderId}
              onChange={(e) => setOffenderId(e.target.value)}
            >
              <option value="">— none —</option>
              {offenderOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.n} incidents
                </option>
              ))}
            </select>
            {offenderId && (
              <p className="mt-2 text-xs text-slate-400">
                White path traces this offender's incidents in time order — the
                slope reveals how fast they move between locations.
              </p>
            )}

            <button
              className={`btn mt-3 w-full ${flat ? "btn-active" : ""}`}
              onClick={() => setFlat((f) => !f)}
            >
              {flat ? "↑ Raise into time cube" : "↓ Flatten to 2D map"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Flatten collapses the time axis so the cube becomes an ordinary
              map — the before/after that makes the metaphor click.
            </p>
          </div>

          <div className="card p-3">
            <div className="label mb-2">Crime types (click to filter)</div>
            <CrimeLegendControlled
              types={types}
              activeTypes={activeTypes}
              onToggle={toggleType}
              onReset={() => setActiveTypes(null)}
            />
          </div>

          <div className="card p-3 text-xs text-slate-400">
            <div className="label mb-1">Reading the cube</div>
            <ul className="list-disc space-y-1 pl-4">
              <li>Vertical column = one place, many times → a chronic hotspot.</li>
              <li>Diagonal streak = activity drifting across space over time.</li>
              <li>Isolated dots = one-off incidents, background noise.</li>
            </ul>
          </div>
        </div>

        {/* Canvas */}
        <div className="card relative h-[62vh] min-h-[440px] overflow-hidden">
          {scene && scene.count > 0 ? (
            <Canvas camera={{ position: [12, 9, 14], fov: 48 }} dpr={[1, 2]}>
              <color attach="background" args={["#080b13"]} />
              <Scene scene={scene} flat={flat} dim={!!offenderId} ticks={ticks} />
            </Canvas>
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">
              No incidents match the current filter.
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-ink/70 px-2 py-1 font-mono text-[11px] text-slate-400">
            {scene?.count?.toLocaleString() || 0} pts · drag to orbit · scroll to
            zoom
          </div>
        </div>
      </div>
    </div>
  );
}

function CrimeLegendControlled({ types, activeTypes, onToggle, onReset }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => {
          const on = !activeTypes || activeTypes.has(t);
          return (
            <button
              key={t}
              onClick={() => onToggle(t)}
              className={`chip inline-flex items-center gap-1.5 transition hover:border-accent/50 ${
                on ? "" : "opacity-35"
              }`}
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
      {activeTypes && (
        <button className="mt-2 text-xs text-accent hover:underline" onClick={onReset}>
          reset filter
        </button>
      )}
    </div>
  );
}
