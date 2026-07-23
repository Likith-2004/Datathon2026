import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Papa from "papaparse";

const DataContext = createContext(null);

const BASE = import.meta.env.BASE_URL || "/";
const url = (f) => `${BASE}data/${f}`.replace(/\/{2,}/g, "/");

function parseCSV(text) {
  return Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transform: (v) => (v === "" ? null : v),
  }).data;
}

const FILES = [
  ["districts", "districts.csv"],
  ["stations", "police_stations.csv"],
  ["offenders", "offenders.csv"],
  ["victims", "victims.csv"],
  ["incidents", "incidents.csv"],
  ["edges", "network_edges.csv"],
  ["weeklyStats", "weekly_station_stats.csv"],
];

export function DataProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    progress: 0,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = {};
        let done = 0;
        // load CSVs
        for (const [key, file] of FILES) {
          const res = await fetch(url(file));
          if (!res.ok) throw new Error(`Failed to load ${file} (${res.status})`);
          const text = await res.text();
          data[key] = parseCSV(text);
          done++;
          if (!cancelled)
            setState((s) => ({ ...s, progress: done / (FILES.length + 1) }));
        }
        // load ground truth
        const gt = await fetch(url("ground_truth.json"));
        if (!gt.ok) throw new Error("Failed to load ground_truth.json");
        data.groundTruth = await gt.json();

        if (!cancelled)
          setState({ loading: false, error: null, progress: 1, data });
      } catch (e) {
        if (!cancelled)
          setState({ loading: false, error: e.message, progress: 0, data: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
    if (!state.data) return null;
    const d = state.data;

    // indexes
    const districtByName = new Map(d.districts.map((x) => [x.district, x]));
    const stationById = new Map(d.stations.map((x) => [x.station_id, x]));
    const offenderById = new Map(d.offenders.map((x) => [x.offender_id, x]));

    const stationsByDistrict = new Map();
    for (const s of d.stations) {
      if (!stationsByDistrict.has(s.district)) stationsByDistrict.set(s.district, []);
      stationsByDistrict.get(s.district).push(s);
    }

    const incidentsByDistrict = new Map();
    for (const inc of d.incidents) {
      if (!incidentsByDistrict.has(inc.district))
        incidentsByDistrict.set(inc.district, []);
      incidentsByDistrict.get(inc.district).push(inc);
    }

    const crimeTypes = Array.from(
      new Set(d.incidents.map((i) => i.crime_type))
    ).sort();

    // date range
    const [minDate, maxDate] = d.groundTruth.date_range;

    return {
      ...d,
      districtByName,
      stationById,
      offenderById,
      stationsByDistrict,
      incidentsByDistrict,
      crimeTypes,
      minDate,
      maxDate,
    };
  }, [state.data]);

  const value = { ...state, data: enriched };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
