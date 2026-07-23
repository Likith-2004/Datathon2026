import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { DataProvider } from "./data/DataContext.jsx";
import AppShell from "./components/AppShell.jsx";
import Landing from "./pages/Landing.jsx";
import SpaceTimeCube from "./pages/SpaceTimeCube.jsx";
import MoFingerprint from "./pages/MoFingerprint.jsx";
import RippleMap from "./pages/RippleMap.jsx";
import NetworkGravity from "./pages/NetworkGravity.jsx";
import AnomalyBloom from "./pages/AnomalyBloom.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <DataProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/space-time-cube" element={<SpaceTimeCube />} />
            <Route path="/mo-fingerprint" element={<MoFingerprint />} />
            <Route path="/ripple-map" element={<RippleMap />} />
            <Route path="/network-gravity" element={<NetworkGravity />} />
            <Route path="/anomaly-bloom" element={<AnomalyBloom />} />
          </Routes>
        </AppShell>
      </DataProvider>
    </HashRouter>
  </React.StrictMode>
);
