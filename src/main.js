import "./style.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const app = document.querySelector("#app");

// Theme: saved choice first, otherwise the device setting.
const THEME_KEY = "omieko-theme";
const INITIALS_KEY = "omieko-initials";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage can be blocked; fall through to the device setting.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

let currentTheme = getInitialTheme();
document.documentElement.dataset.theme = currentTheme;

// ==========================================
// 1. APPLICATION INTERFACE
// ==========================================

app.innerHTML = `
<div class="app-shell">

  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">O</div>
      <div>
        <h1>OMI-EKO <span>PMOD</span></h1>
        <p>Passenger Mobility & Multimodal Transport</p>
      </div>
    </div>

    <nav class="topbar-actions" aria-label="Application controls">

      <button type="button" class="nav-btn is-active" id="toggle-sidebar" aria-pressed="true" title="Show or hide the layer panel">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/></svg>
        <span>Layers</span>
      </button>

      <button type="button" class="nav-btn is-active" id="toggle-details" aria-pressed="true" title="Show or hide the details panel">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>
        <span>Details</span>
      </button>

      <span class="nav-divider"></span>

      <label class="switch" title="Show terminal initials on the map">
        <input type="checkbox" id="initials-toggle">
        <span class="switch-track"><span class="switch-thumb"></span></span>
        <span class="switch-label">Terminal initials</span>
      </label>

      <span class="nav-divider"></span>

      <button type="button" class="icon-btn" id="theme-toggle" aria-label="Switch to dark mode" aria-pressed="false" title="Dark or light mode">
        <svg class="icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>

      <button type="button" class="icon-btn" id="fullscreen-btn" aria-label="Full-screen map" title="Full-screen map">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
      </button>

    </nav>
  </header>

  <main class="workspace">

    <aside class="sidebar">

      <div class="section-heading">
        <span>MAP LAYERS</span>
        <span class="layer-count">13</span>
      </div>

      <div class="layer-group">
        <p class="group-label">MARITIME NETWORK</p>

        <label>
          <input type="checkbox" id="terminals-toggle" checked>
          Ferry terminals
        </label>

        <label>
          <input type="checkbox" id="routes-toggle" checked>
          Actual ferry routes
        </label>

        <div class="route-panel">
          <div class="route-tools">
            <input type="search" id="route-search" placeholder="Search routes..." autocomplete="off">
            <div class="route-buttons">
              <button type="button" id="routes-select-all">Select all</button>
              <button type="button" id="routes-clear-all">Clear all</button>
            </div>
            <select id="route-sort">
              <option value="code">Sort: route order</option>
              <option value="index">Sort: highest route index first</option>
            </select>
          </div>
          <div id="route-list" class="route-list">
            <p class="route-loading">Loading routes...</p>
          </div>
          <div id="route-tier-key" class="route-tier-key"></div>
        </div>
      </div>

      <div class="layer-group">
        <p class="group-label">TERMINAL THEMATIC ANALYSIS</p>

        <label>
          <input type="checkbox" id="index-toggle" checked>
          Transport network accessibility
        </label>

        <label>
          <input type="checkbox" id="passengers-toggle">
          Terminal passengers
        </label>

        <label>
          <input type="checkbox" id="population-toggle">
          Catchment population
        </label>

        <label>
          <input type="checkbox" id="intersections-toggle">
          Network intersections
        </label>
      </div>

      <div class="layer-group">
        <p class="group-label">PROXIMITY ANALYSIS - ROADS</p>

        <label>
          <input type="checkbox" id="roads-toggle" checked>
          All clipped roads
        </label>

        <label>
          <input type="checkbox" id="motorway-toggle">
          Motorways
        </label>

        <label>
          <input type="checkbox" id="trunk-toggle">
          Trunk roads
        </label>

        <label>
          <input type="checkbox" id="primary-toggle">
          Primary roads
        </label>

        <label>
          <input type="checkbox" id="secondary-toggle">
          Secondary roads
        </label>

        <label>
          <input type="checkbox" id="residential-toggle">
          Residential roads
        </label>
      </div>

      <div class="layer-group">
        <p class="group-label">RAIL AND BUS NETWORK</p>

        <label>
          <input type="checkbox" id="blue-toggle">
          Blue Line
        </label>

        <label>
          <input type="checkbox" id="red-toggle">
          Red Line
        </label>

        <label>
          <input type="checkbox" id="brt-toggle">
          BRT routes
        </label>
      </div>

      <div class="sidebar-note">
        <strong>PROXIMITY ANALYSIS</strong>

        <div><span>Motorway features</span><b>483</b></div>
        <div><span>Trunk road features</span><b>35</b></div>
        <div><span>Primary road features</span><b>1,078</b></div>
        <div><span>Secondary road features</span><b>1,398</b></div>
        <div><span>Residential road features</span><b>13,913</b></div>
        <div><span>Total clipped features</span><b>16,907</b></div>
      </div>

    </aside>

    <section class="map-section">

      <div class="map-heading">
        <div>
          <h2>Lagos Multimodal Network</h2>
          <p>Terminal accessibility and transport network analysis</p>
        </div>

        <div class="map-actions">
          <button id="locate-btn">Locate me</button>
          <button id="reset-btn">Reset view</button>
        </div>
      </div>

      <div id="map"></div>

      <div class="map-footer">
        <span>
          <i class="legend-dot terminal-dot"></i>
          Ferry terminal
        </span>

        <span>
          <i class="legend-line route-line"></i>
          Ferry route
        </span>

        <span>WGS 84 - EPSG:4326</span>
      </div>

    </section>

    <aside class="details-panel">

      <div class="section-heading">
        NETWORK DETAILS
      </div>

      <div id="details-content">
        <div class="empty-state">
          <div class="empty-icon">+</div>
          <h3>Select a terminal or route</h3>
          <p>
            Click a ferry terminal or a ferry route to view its analysis.
          </p>
        </div>
      </div>

    </aside>

  </main>
</div>
`;

// ==========================================
// 2. INITIALISE LEAFLET MAP
// ==========================================

const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true,
}).setView([6.48, 3.45], 10);

// Terminals live in their own pane + canvas renderer, stacked above the route,
// road and rail canvases. Each canvas intercepts mouse events for the whole map,
// so a canvas stacked above the terminals (e.g. routeRenderer) swallows their
// hover and click events.
map.createPane("terminalPane");
map.getPane("terminalPane").style.zIndex = 450; // above overlayPane (400), below markers/tooltips
const terminalRenderer = L.canvas({ pane: "terminalPane", tolerance: 4 });

L.control
  .zoom({
    position: "bottomright",
  })
  .addTo(map);

// One basemap for both themes. Dark mode darkens these same tiles with a CSS
// filter (see "html[data-theme=dark] .leaflet-tile-pane" in style.css), so it
// does not depend on a second tile provider being reachable.
const osmTiles = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
);

const baseMaps = {
  light: osmTiles,
  dark: osmTiles,
};

let activeBaseMap = null;

function setBasemap(theme) {
  const next = baseMaps[theme] || baseMaps.light;

  if (activeBaseMap === next) return;
  if (activeBaseMap) map.removeLayer(activeBaseMap);

  activeBaseMap = next;
  activeBaseMap.addTo(map);
  activeBaseMap.bringToBack();
}

setBasemap(currentTheme);

let initialMapBounds = null;

// ==========================================
// 3. CREATE LAYER GROUPS
// ==========================================

const terminalLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const terminalLabelLayer = L.layerGroup();

const thematicLayers = {
  index: L.layerGroup().addTo(map),
  passengers: L.layerGroup(),
  population: L.layerGroup(),
  intersections: L.layerGroup(),
};

const roadLayers = {
  motorway: L.layerGroup(),
  trunk: L.layerGroup(),
  primary: L.layerGroup(),
  secondary: L.layerGroup(),
  residential: L.layerGroup(),
};

const otherLayers = {
  blue: L.layerGroup(),
  red: L.layerGroup(),
  brt: L.layerGroup(),
};

// ==========================================
// 4. ACCESSIBILITY CLASSIFICATION
// ==========================================

// Terminal spatial index tiers, as classified in QGIS:
//   Tier 1 - Highest : Sp_Index >= 0.60
//   Tier 2 - Moderate: Sp_Index >= 0.32 and < 0.60
//   Tier 3 - Lowest  : Sp_Index <  0.32
// The Sp_Tier / Tier_Label fields in the GeoJSON take priority;
// the thresholds below are only a fallback when those fields are missing.

const accessibilityClasses = [
  {
    tier: 1,
    label: "Tier 1 - Highest",
    range: "0.60 and above",
    color: "#1a9850",
  },
  {
    tier: 2,
    label: "Tier 2 - Moderate",
    range: "0.32 to below 0.60",
    color: "#f6b93b",
  },
  {
    tier: 3,
    label: "Tier 3 - Lowest",
    range: "below 0.32",
    color: "#d73027",
  },
];

function getAccessibilityClass(value, props) {
  const savedTier = Number(props && props.Sp_Tier);

  if (savedTier) {
    const match = accessibilityClasses.find((item) => item.tier === savedTier);
    if (match) return match;
  }

  const v = Number(value) || 0;

  if (v >= 0.6) return accessibilityClasses[0];
  if (v >= 0.32) return accessibilityClasses[1];
  return accessibilityClasses[2];
}

// ==========================================
// 5. TERMINAL DETAILS PANEL
// ==========================================

function showTerminalDetails(properties) {
  const name = properties.Name || "Ferry Terminal";

  const index = Number(properties.Sp_Index);
  const passengers = Number(properties.Passengers) || 0;
  const population = Number(properties.Pop_2km) || 0;
  const intersections = Number(properties.Intersecti) || 0;

  const classification = getAccessibilityClass(index, properties);

  document.querySelector("#details-content").innerHTML = `
    <div class="terminal-detail">

      <div class="detail-kicker">
        TERMINAL ACCESSIBILITY ANALYSIS
      </div>

      <h2>${name}</h2>

      <p class="detail-description">
        Transport network connectivity profile
      </p>

      <div class="metric-grid">

        <div class="metric-card">
          <span>Spatial index</span>
          <strong>${index.toFixed(2)}</strong>
        </div>

        <div class="metric-card">
          <span>Spatial tier</span>
          <strong>${classification.label}</strong>
        </div>

        <div class="metric-card">
          <span>Passengers</span>
          <strong>${passengers.toLocaleString()}</strong>
        </div>

        <div class="metric-card">
          <span>2 km population</span>
          <strong>${population.toLocaleString()}</strong>
        </div>

        <div class="metric-card">
          <span>Intersections</span>
          <strong>${intersections.toLocaleString()}</strong>
        </div>

      </div>

      <p class="data-note">
        Higher spatial index values indicate better connectivity
        to the surrounding transport network.
      </p>

    </div>
  `;
}

// ==========================================
// 6. LOAD ACTUAL TERMINAL GEOJSON
// ==========================================

let terminalGeoJSON = null;
let terminalGeoJSONLayer = null;

// Short labels for the map, e.g. "Ebute Ero" -> "EE", "Lekki 1" -> "L1".
// Single-word names start with two letters and grow until every label is unique.

function buildTerminalInitials(names) {
  const clean = names.map((n) => String(n || "").trim());
  const lengths = clean.map(() => 2);

  const make = (name, len) => {
    const words = name.split(/\s+/).filter(Boolean);

    if (words.length > 1) {
      return words
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    }

    return name.slice(0, len).toUpperCase();
  };

  for (let pass = 0; pass < 6; pass++) {
    const labels = clean.map((name, i) => make(name, lengths[i]));
    const counts = {};
    labels.forEach((l) => (counts[l] = (counts[l] || 0) + 1));

    let changed = false;

    labels.forEach((label, i) => {
      const isSingleWord = clean[i].split(/\s+/).filter(Boolean).length === 1;

      if (counts[label] > 1 && isSingleWord && lengths[i] < clean[i].length) {
        lengths[i] += 1;
        changed = true;
      }
    });

    if (!changed) break;
  }

  return clean.map((name, i) => make(name, lengths[i]));
}

function buildTerminalLabels() {
  terminalLabelLayer.clearLayers();

  const layers = [];
  terminalGeoJSONLayer.eachLayer((layer) => layers.push(layer));

  const initials = buildTerminalInitials(
    layers.map((layer) => layer.feature?.properties?.Name),
  );

  layers.forEach((layer, i) => {
    if (!layer.getLatLng) return;

    L.marker(layer.getLatLng(), {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: "terminal-initial-icon",
        html: `<span class="terminal-initial">${escapeHTML(initials[i])}</span>`,
        iconSize: [0, 0],
      }),
    }).addTo(terminalLabelLayer);
  });
}

async function loadTerminalData() {
  try {
    console.log("Loading actual terminal data...");

    const response = await fetch(
      "/data/analysis/Terminal_Spatial_Index.geojson",
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    terminalGeoJSON = await response.json();

    terminalLayer.clearLayers();
    thematicLayers.index.clearLayers();
    thematicLayers.passengers.clearLayers();
    thematicLayers.population.clearLayers();
    thematicLayers.intersections.clearLayers();

    // Actual terminal geometry from QGIS.

    terminalGeoJSONLayer = L.geoJSON(terminalGeoJSON, {
      pointToLayer: (feature, latlng) => {
        const p = feature.properties || {};
        const index = Number(p.Sp_Index) || 0;

        const classification = getAccessibilityClass(index, p);

        return L.circleMarker(latlng, {
          renderer: terminalRenderer,
          pane: "terminalPane",
          radius: 9,
          color: "#ffffff",
          weight: 2,
          fillColor: classification.color,
          fillOpacity: 0.95,
        });
      },

      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};

        const name = p.Name || "Ferry Terminal";
        const index = Number(p.Sp_Index) || 0;

        const classification = getAccessibilityClass(index, p);

        const fmt = (v) => (Number(v) || 0).toLocaleString("en-US");
        const tierLabel = p.Tier_Label || classification.label;

        layer.bindTooltip(
          `<div class="terminal-hover">
             <strong>${name}</strong>
             <div class="hover-divider"></div>
             <div><span>Spatial Index</span><b>${index.toFixed(2)}</b></div>
             <div><span>Spatial Tier</span><b>${tierLabel}</b></div>
             <div><span>Passengers</span><b>${fmt(p.Passengers)}</b></div>
             <div><span>Catchment Population</span><b>${fmt(p.Pop_2km)}</b></div>
             <div><span>Road Intersections</span><b>${fmt(p.Intersecti)}</b></div>
           </div>`,
          {
            direction: "top",
            sticky: true,
            opacity: 0.97,
            className: "terminal-data-tooltip",
          },
        );

        layer.bindPopup(`
          <strong>${name}</strong>
          <hr>
          Spatial index: ${index.toFixed(2)}
          <br>
          Spatial tier: ${classification.label}
          <br>
          Passengers: ${(Number(p.Passengers) || 0).toLocaleString()}
          <br>
          Catchment population: ${(Number(p.Pop_2km) || 0).toLocaleString()}
          <br>
          Intersections: ${(Number(p.Intersecti) || 0).toLocaleString()}
        `);

        layer.on("click", () => {
          showTerminalDetails(p);
        });
      },
    });

    terminalGeoJSONLayer.addTo(terminalLayer);

    buildTerminalLabels();

    // ======================================
    // BUILD TERMINAL THEMATIC LAYERS
    // ======================================

    terminalGeoJSON.features.forEach((feature) => {
      const p = feature.properties || {};

      if (!feature.geometry) return;

      const name = p.Name || "Ferry Terminal";

      const latlng = L.geoJSON(feature).getBounds().getCenter();

      const index = Number(p.Sp_Index) || 0;
      const passengers = Number(p.Passengers) || 0;
      const population = Number(p.Pop_2km) || 0;
      const intersections = Number(p.Intersecti) || 0;

      // Terminal accessibility index

      const classification = getAccessibilityClass(index, p);

      L.circleMarker(latlng, {
        interactive: false,
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: classification.color,
        fillOpacity: 0.95,
      })
        .bindPopup(
          `<strong>${name}</strong><br>
           Spatial index: ${index.toFixed(2)}<br>
           Spatial tier: ${classification.label}`,
        )
        .addTo(thematicLayers.index);

      // Passenger distribution

      L.circleMarker(latlng, {
        interactive: false,
        radius: 5 + Math.sqrt(passengers) / 35,
        color: "#ffffff",
        weight: 1,
        fillColor: "#1769aa",
        fillOpacity: 0.8,
      })
        .bindPopup(
          `<strong>${name}</strong><br>
           Passengers: ${passengers.toLocaleString()}`,
        )
        .addTo(thematicLayers.passengers);

      // Catchment population

      L.circleMarker(latlng, {
        interactive: false,
        radius: 5 + Math.sqrt(population) / 35,
        color: "#ffffff",
        weight: 1,
        fillColor: "#8e44ad",
        fillOpacity: 0.8,
      })
        .bindPopup(
          `<strong>${name}</strong><br>
           Catchment population: ${population.toLocaleString()}`,
        )
        .addTo(thematicLayers.population);

      // Network intersections

      L.circleMarker(latlng, {
        interactive: false,
        radius: 5 + Math.sqrt(intersections) / 5,
        color: "#ffffff",
        weight: 1,
        fillColor: "#e67e22",
        fillOpacity: 0.85,
      })
        .bindPopup(
          `<strong>${name}</strong><br>
           Intersections: ${intersections.toLocaleString()}`,
        )
        .addTo(thematicLayers.intersections);
    });

    console.log("TERMINAL DATA SUCCESSFULLY LOADED");
    console.log("Terminal features:", terminalGeoJSON.features.length);

    return terminalGeoJSONLayer;
  } catch (error) {
    console.error("Terminal data loading failed:", error);
    return null;
  }
}

// ==========================================
// 7. ACCESSIBILITY MAP LEGEND
// ==========================================

const accessibilityLegend = L.control({
  position: "bottomleft",
});

accessibilityLegend.onAdd = function () {
  const div = L.DomUtil.create("div", "info legend map-legend");

  div.innerHTML = `
    <strong>TERMINAL SPATIAL INDEX TIERS</strong>
    <br>
    ${accessibilityClasses
      .map(
        (item) => `
      <div style="display:flex;align-items:center;gap:7px;">
        <span style="
          display:inline-block;
          width:13px;
          height:13px;
          border-radius:50%;
          background:${item.color};
          border:1px solid #777;
        "></span>
        ${item.label}
        (${item.range})
      </div>
    `,
      )
      .join("")}
  `;

  return div;
};

accessibilityLegend.addTo(map);

// ==========================================
// 8. LOAD ACTUAL FERRY ROUTE GEOJSON
// ==========================================

const routeColours = {
  "1A": "#00a83b",
  "1B": "#0057d9",
  2: "#e00000",
  3: "#8e44ad",
  4: "#f39c12",
  5: "#16a085",
  6: "#e84393",
  7: "#34495e",
  8: "#d35400",
  9: "#7f8c8d",
  F1: "#2c3e50",
  F2: "#c0392b",
  F3: "#27ae60",
  F5: "#2980b9",
  F6: "#9b59b6",
  F7: "#b8860b",
};

function getRouteCode(routeName) {
  const match = String(routeName || "")
    .trim()
    .match(/^(1A|1B|F[1-7]|[2-9])\b/);
  return match ? match[1] : null;
}

// Route index tiers reuse the terminal breakpoints (0.32 and 0.60).
// Change the two numbers below if you later define different route breakpoints.

const ROUTE_TIER_BREAKS = { highest: 0.6, moderate: 0.32 };

function getRouteTier(value) {
  const v = Number(value) || 0;

  if (v >= ROUTE_TIER_BREAKS.highest) return accessibilityClasses[0];
  if (v >= ROUTE_TIER_BREAKS.moderate) return accessibilityClasses[1];
  return accessibilityClasses[2];
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanRouteName(name) {
  return String(name || "Ferry route")
    .replace(/\s+/g, " ")
    .trim();
}

const fmtNumber = (v) => (Number(v) || 0).toLocaleString("en-US");

// One entry per ferry route, keyed by the (cleaned) Route_Name.
const routeRegistry = {};
let selectedRouteKey = null;

// Wider hit area so thin route lines are easy to hover.
const routeRenderer = L.canvas({ padding: 0.5, tolerance: 6 });

function routeStyle(entry) {
  const selected = entry.key === selectedRouteKey;
  const active = selected || entry.hover;

  return {
    color: entry.colour,
    weight: selected ? 7 : active ? 6 : 3,
    opacity: active ? 1 : 0.85,
    lineCap: "round",
    lineJoin: "round",
  };
}

function applyRouteStyle(entry) {
  entry.layer.setStyle(routeStyle(entry));
}

function routeTooltipHTML(entry) {
  const p = entry.props;

  return `<div class="terminal-hover">
    <strong>${escapeHTML(entry.name)}</strong>
    <div class="hover-divider"></div>
    <div><span>Route Index</span><b>${(Number(p.Rout_index) || 0).toFixed(2)}</b></div>
    <div><span>Index Tier</span><b>${escapeHTML(entry.tier.label)}</b></div>
    <div><span>Passengers</span><b>${fmtNumber(p.Passenger)}</b></div>
    <div><span>Distance Saved</span><b>${(Number(p.DistSav) || 0).toFixed(2)} km</b></div>
    <div><span>Time Saved</span><b>${(Number(p.Time_save) || 0).toFixed(0)} min</b></div>
    <div><span>Time Saved Class</span><b>${escapeHTML(p.Time_Class || "N/A")}</b></div>
  </div>`;
}

function showRouteDetails(entry) {
  const p = entry.props;
  const idx = Number(p.Rout_index) || 0;
  const dist = Number(p.DistSav) || 0;
  const time = Number(p.Time_save) || 0;

  const zeroNote =
    dist === 0 && time === 0
      ? `<p class="data-note">Distance saved and time saved are both 0 in the source data for this route.</p>`
      : "";

  document.querySelector("#details-content").innerHTML = `
    <div class="terminal-detail">

      <div class="detail-kicker">FERRY ROUTE ANALYSIS</div>

      <h2>${escapeHTML(entry.name)}</h2>

      <p class="detail-description">
        <span class="route-swatch" style="background:${entry.colour}"></span>
        Route ${escapeHTML(entry.code || "-")}
      </p>

      <div class="metric-grid">

        <div class="metric-card">
          <span>Route index</span>
          <strong>${idx.toFixed(2)}</strong>
        </div>

        <div class="metric-card">
          <span>Index tier</span>
          <strong>${escapeHTML(entry.tier.label)}</strong>
        </div>

        <div class="metric-card">
          <span>Passengers</span>
          <strong>${fmtNumber(p.Passenger)}</strong>
        </div>

        <div class="metric-card">
          <span>Distance saved</span>
          <strong>${dist.toFixed(2)} km</strong>
        </div>

        <div class="metric-card">
          <span>Time saved</span>
          <strong>${time.toFixed(0)} min</strong>
        </div>

        <div class="metric-card">
          <span>Time saved class</span>
          <strong>${escapeHTML(p.Time_Class || "N/A")}</strong>
        </div>

      </div>

      ${zeroNote}

      <p class="data-note">
        Route index values and classes come from the QGIS route analysis.
        Index tiers use the same breakpoints as the terminal spatial index.
      </p>

    </div>
  `;
}

function setRouteVisible(entry, visible) {
  entry.visible = visible;

  if (visible) {
    routeLayer.addLayer(entry.layer);
  } else {
    routeLayer.removeLayer(entry.layer);
  }

  const box = document.querySelector(
    `#route-list input[type="checkbox"][data-key="${CSS.escape(entry.key)}"]`,
  );
  if (box) box.checked = visible;

  // Ticking a route while the main "Actual ferry routes" switch is off turns it on.
  if (visible) {
    const master = document.querySelector("#routes-toggle");
    if (master && !master.checked) {
      master.checked = true;
      master.dispatchEvent(new Event("change"));
    }
  }
}

function markSelectedRow() {
  document.querySelectorAll("#route-list .route-row").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.key === selectedRouteKey);
  });
}

function selectRoute(key, options = {}) {
  const entry = routeRegistry[key];
  if (!entry) return;

  const previous = routeRegistry[selectedRouteKey];
  selectedRouteKey = key;

  if (previous) applyRouteStyle(previous);

  if (options.zoom && !entry.visible) {
    setRouteVisible(entry, true);
  }

  applyRouteStyle(entry);
  if (entry.visible) entry.layer.bringToFront();

  showRouteDetails(entry);
  markSelectedRow();

  if (options.zoom) {
    const bounds = entry.layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }
}

function getSortedRouteEntries() {
  const entries = Object.values(routeRegistry);
  const mode = document.querySelector("#route-sort")?.value || "code";

  if (mode === "index") {
    return entries.sort(
      (a, b) =>
        (Number(b.props.Rout_index) || 0) - (Number(a.props.Rout_index) || 0) ||
        a.name.localeCompare(b.name),
    );
  }

  const order = Object.keys(routeColours);
  const rank = (e) => {
    const i = order.indexOf(e.code);
    return i === -1 ? order.length : i;
  };

  return entries.sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
  );
}

function renderRouteList() {
  const list = document.querySelector("#route-list");
  if (!list) return;

  const entries = getSortedRouteEntries();

  list.innerHTML = entries
    .map((entry) => {
      const idx = (Number(entry.props.Rout_index) || 0).toFixed(2);
      const shortTier = entry.tier.label.replace(/^Tier \d - /, "");
      const key = escapeHTML(entry.key);

      return `
        <div class="route-row${entry.key === selectedRouteKey ? " is-selected" : ""}" data-key="${key}">
          <label class="route-check" title="Show or hide this route">
            <input type="checkbox" data-key="${key}" ${entry.visible ? "checked" : ""}>
            <span class="route-swatch" style="background:${entry.colour}"></span>
          </label>
          <div class="route-text">
            <button type="button" class="route-name" data-key="${key}">${escapeHTML(entry.name)}</button>
            <span class="route-meta">
              Index <b>${idx}</b>
              <i class="tier-dot" style="background:${entry.tier.color}"></i>${escapeHTML(shortTier)}
              &middot; ${fmtNumber(entry.props.Passenger)} pax
            </span>
          </div>
        </div>
      `;
    })
    .join("");

  filterRouteList();
}

function filterRouteList() {
  const term = (document.querySelector("#route-search")?.value || "")
    .trim()
    .toLowerCase();

  document.querySelectorAll("#route-list .route-row").forEach((row) => {
    const entry = routeRegistry[row.dataset.key];
    const text = entry ? entry.name.toLowerCase() : "";
    row.style.display = !term || text.includes(term) ? "" : "none";
  });
}

function renderRouteTierKey() {
  const box = document.querySelector("#route-tier-key");
  if (!box) return;

  box.innerHTML = `
    <strong>ROUTE INDEX TIERS</strong>
    ${accessibilityClasses
      .map(
        (item) => `
        <div>
          <i class="tier-dot" style="background:${item.color}"></i>
          ${item.label} <span>(${item.range})</span>
        </div>`,
      )
      .join("")}
  `;
}

let routeControlsReady = false;

function setupRouteControls() {
  if (routeControlsReady) return;
  routeControlsReady = true;

  const list = document.querySelector("#route-list");

  list.addEventListener("change", (event) => {
    const box = event.target.closest('input[type="checkbox"][data-key]');
    if (!box) return;

    const entry = routeRegistry[box.dataset.key];
    if (entry) setRouteVisible(entry, box.checked);
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button.route-name");
    if (!button) return;

    selectRoute(button.dataset.key, { zoom: true });
  });

  document.querySelector("#routes-select-all").addEventListener("click", () => {
    Object.values(routeRegistry).forEach((entry) =>
      setRouteVisible(entry, true),
    );
  });

  document.querySelector("#routes-clear-all").addEventListener("click", () => {
    Object.values(routeRegistry).forEach((entry) =>
      setRouteVisible(entry, false),
    );
  });

  document
    .querySelector("#route-search")
    .addEventListener("input", filterRouteList);
  document
    .querySelector("#route-sort")
    .addEventListener("change", renderRouteList);
}

async function loadRouteData() {
  try {
    console.log("Loading actual ferry route geometries...");

    const response = await fetch(
      "/data/analysis/Route_Passenger_Analysis.geojson",
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    Object.keys(routeRegistry).forEach((key) => delete routeRegistry[key]);
    routeLayer.clearLayers();

    (data.features || []).forEach((feature) => {
      if (!feature.geometry) return;

      const p = feature.properties || {};
      const name = cleanRouteName(p.Route_Name);

      if (routeRegistry[name]) {
        console.warn("Duplicate route name skipped:", name);
        return;
      }

      const code = getRouteCode(p.Route_Name);

      const entry = {
        key: name,
        name,
        code,
        props: p,
        colour: routeColours[code] || "#333333",
        tier: getRouteTier(p.Rout_index),
        visible: true,
        hover: false,
        layer: null,
      };

      entry.layer = L.geoJSON(feature, {
        renderer: routeRenderer,
        style: () => routeStyle(entry),
      });

      entry.layer.bindTooltip(routeTooltipHTML(entry), {
        sticky: true,
        direction: "top",
        opacity: 0.97,
        className: "terminal-data-tooltip route-data-tooltip",
      });

      entry.layer.on("mouseover", () => {
        entry.hover = true;
        applyRouteStyle(entry);
        entry.layer.bringToFront();
      });

      entry.layer.on("mouseout", () => {
        entry.hover = false;
        applyRouteStyle(entry);
      });

      entry.layer.on("click", () => selectRoute(entry.key));

      routeRegistry[name] = entry;
      routeLayer.addLayer(entry.layer);
    });

    const entries = Object.values(routeRegistry);

    setupRouteControls();
    renderRouteList();
    renderRouteTierKey();

    console.log("ACTUAL FERRY ROUTES LOADED");
    console.log("Route features:", entries.length);

    return L.featureGroup(entries.map((entry) => entry.layer));
  } catch (error) {
    console.error("Ferry route loading failed:", error);

    const list = document.querySelector("#route-list");
    if (list) {
      list.innerHTML =
        '<p class="route-loading">Ferry routes could not be loaded.</p>';
    }

    return null;
  }
}

// ==========================================
// 9. LOAD PROXIMITY ANALYSIS ROAD DATA
// ==========================================

const roadFiles = [
  {
    key: "motorway",
    file: "/data/roads/Motorway_2km_Clips.geojson",
    name: "Motorways",
    color: "#e53935",
    weight: 3.5,
  },
  {
    key: "trunk",
    file: "/data/roads/Trunk_Road_2km_Clips.geojson",
    name: "Trunk roads",
    color: "#ff8f00",
    weight: 3,
  },
  {
    key: "primary",
    file: "/data/roads/Primary_Roads_2km_Clips.geojson",
    name: "Primary roads",
    color: "#fdd835",
    weight: 2.5,
  },
  {
    key: "secondary",
    file: "/data/roads/Secondary_Roads_2km_Clips.geojson",
    name: "Secondary roads",
    color: "#26a69a",
    weight: 2,
  },
  {
    key: "residential",
    file: "/data/roads/Residential_Roads_2km_Clips.geojson",
    name: "Residential roads",
    color: "#7986cb",
    weight: 1.2,
  },
];

async function loadRoadData() {
  console.log("Loading proximity analysis road data...");

  const results = await Promise.all(
    roadFiles.map(async (item) => {
      try {
        const response = await fetch(item.file);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const geojsonLayer = L.geoJSON(data, {
          style: {
            color: item.color,
            weight: item.weight,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round",
          },

          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};

            const roadName = p.names || p.name || p.id || item.name;

            layer.bindTooltip(`${item.name}: ${roadName}`, {
              sticky: true,
            });
          },
        });

        geojsonLayer.addTo(roadLayers[item.key]);

        console.log(`${item.name}: ${data.features.length} features loaded`);

        return data.features.length;
      } catch (error) {
        console.error(`Failed to load ${item.name}:`, error);
        return 0;
      }
    }),
  );

  const total = results.reduce((sum, count) => sum + count, 0);

  console.log("Total road features loaded:", total);
}

// ==========================================
// 10. LOAD RAILWAY AND BRT GEOJSON
// ==========================================

async function loadTransportData() {
  const transportFiles = [
    {
      file: "/data/transport/Blue_Line.geojson",
      layer: otherLayers.blue,
      name: "Blue Line",
      color: "#168bd2",
      weight: 5,
      point: false,
    },
    {
      file: "/data/transport/Blue_Line_Stops.geojson",
      layer: otherLayers.blue,
      name: "Blue Line stop",
      color: "#168bd2",
      point: true,
    },
    {
      file: "/data/transport/Red_Line.geojson",
      layer: otherLayers.red,
      name: "Red Line",
      color: "#dc3545",
      weight: 5,
      point: false,
    },
    {
      file: "/data/transport/Red_Line_Stops.geojson",
      layer: otherLayers.red,
      name: "Red Line stop",
      color: "#dc3545",
      point: true,
    },
    {
      file: "/data/transport/BRT_Routes.geojson",
      layer: otherLayers.brt,
      name: "BRT route",
      color: "#e69b25",
      weight: 4,
      point: false,
    },
  ];

  for (const item of transportFiles) {
    try {
      const response = await fetch(item.file);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const geojsonLayer = L.geoJSON(data, {
        style: item.point
          ? undefined
          : {
              color: item.color,
              weight: item.weight,
              opacity: 0.9,
            },

        pointToLayer: item.point
          ? (feature, latlng) =>
              L.circleMarker(latlng, {
                radius: 6,
                color: "#ffffff",
                weight: 2,
                fillColor: item.color,
                fillOpacity: 1,
              })
          : undefined,

        onEachFeature: (feature, layer) => {
          const id = feature.properties?.id;

          layer.bindTooltip(
            id !== undefined ? `${item.name} - ID ${id}` : item.name,
          );
        },
      });

      geojsonLayer.addTo(item.layer);

      console.log(`${item.name}: ${data.features.length} features loaded`);
    } catch (error) {
      console.error(`Failed to load ${item.name}:`, error);
    }
  }

  console.log("Railway and BRT loading completed.");
}

// ==========================================
// 11. LAYER VISIBILITY CONTROLS
// ==========================================

function toggleLayer(id, layer) {
  const checkbox = document.querySelector(`#${id}`);

  checkbox.addEventListener("change", (event) => {
    if (event.target.checked) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }
  });
}

toggleLayer("terminals-toggle", terminalLayer);
toggleLayer("routes-toggle", routeLayer);

toggleLayer("index-toggle", thematicLayers.index);
toggleLayer("passengers-toggle", thematicLayers.passengers);
toggleLayer("population-toggle", thematicLayers.population);
toggleLayer("intersections-toggle", thematicLayers.intersections);

toggleLayer("blue-toggle", otherLayers.blue);
toggleLayer("red-toggle", otherLayers.red);
toggleLayer("brt-toggle", otherLayers.brt);

// ==========================================
// 12. ROAD VISIBILITY CONTROLS
// ==========================================

const roadCheckboxes = {
  motorway: "motorway-toggle",
  trunk: "trunk-toggle",
  primary: "primary-toggle",
  secondary: "secondary-toggle",
  residential: "residential-toggle",
};

function updateRoadVisibility() {
  const allRoadsChecked = document.querySelector("#roads-toggle").checked;

  Object.keys(roadLayers).forEach((key) => {
    const individualChecked = document.querySelector(
      `#${roadCheckboxes[key]}`,
    ).checked;

    const shouldShow = allRoadsChecked || individualChecked;

    if (shouldShow) {
      roadLayers[key].addTo(map);
    } else {
      map.removeLayer(roadLayers[key]);
    }
  });
}

document
  .querySelector("#roads-toggle")
  .addEventListener("change", updateRoadVisibility);

Object.values(roadCheckboxes).forEach((id) => {
  document
    .querySelector(`#${id}`)
    .addEventListener("change", updateRoadVisibility);
});

// ==========================================
// 13. LOCATE USER
// ==========================================

let userLocationMarker = null;

document.querySelector("#locate-btn").addEventListener("click", () => {
  map.locate({
    setView: true,
    maxZoom: 15,
  });
});

map.on("locationfound", (event) => {
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }

  userLocationMarker = L.circleMarker(event.latlng, {
    radius: 8,
    color: "#ffffff",
    weight: 3,
    fillColor: "#2474d2",
    fillOpacity: 1,
  })
    .addTo(map)
    .bindPopup("Your current location")
    .openPopup();
});

map.on("locationerror", () => {
  alert(
    "Unable to access your location. Check your browser location permission.",
  );
});

// ==========================================
// 14. RESET MAP VIEW
// ==========================================

document.querySelector("#reset-btn").addEventListener("click", () => {
  if (initialMapBounds && initialMapBounds.isValid()) {
    map.fitBounds(initialMapBounds, {
      padding: [30, 30],
      maxZoom: 12,
    });
  } else {
    map.setView([6.48, 3.45], 10);
  }
});

// ==========================================
// 16. NAVIGATION BAR CONTROLS
// ==========================================

// Keeps the map sized correctly while a panel slides open or closed.
function smoothMapResize(duration = 480) {
  const start = performance.now();

  function tick(now) {
    map.invalidateSize({ animate: false });
    if (now - start < duration) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// --- Dark / light mode ---

const themeButton = document.querySelector("#theme-toggle");

function applyTheme(theme, save = true) {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  setBasemap(theme);

  themeButton.setAttribute("aria-pressed", String(theme === "dark"));
  themeButton.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );

  if (save) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be blocked; the theme still changes for this visit.
    }
  }
}

themeButton.addEventListener("click", () => {
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

window
  .matchMedia?.("(prefers-color-scheme: dark)")
  ?.addEventListener?.("change", (event) => {
    let saved = null;

    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      saved = null;
    }

    if (!saved) applyTheme(event.matches ? "dark" : "light", false);
  });

applyTheme(currentTheme, false);

// --- Terminal initials ---

const initialsToggle = document.querySelector("#initials-toggle");

function updateTerminalLabels() {
  const show = initialsToggle.checked && map.hasLayer(terminalLayer);

  if (show) {
    terminalLabelLayer.addTo(map);
  } else {
    map.removeLayer(terminalLabelLayer);
  }
}

try {
  initialsToggle.checked = localStorage.getItem(INITIALS_KEY) === "1";
} catch {
  initialsToggle.checked = false;
}

initialsToggle.addEventListener("change", () => {
  try {
    localStorage.setItem(INITIALS_KEY, initialsToggle.checked ? "1" : "0");
  } catch {
    // Ignore blocked storage.
  }

  updateTerminalLabels();
});

// Hide the initials too when the whole terminal layer is switched off.
document
  .querySelector("#terminals-toggle")
  .addEventListener("change", updateTerminalLabels);

updateTerminalLabels();

// --- Show / hide side panels ---

const workspace = document.querySelector(".workspace");

function setupPanelToggle(buttonId, hideClass) {
  const button = document.querySelector(buttonId);

  button.addEventListener("click", () => {
    const hidden = workspace.classList.toggle(hideClass);

    button.setAttribute("aria-pressed", String(!hidden));
    button.classList.toggle("is-active", !hidden);

    smoothMapResize();
  });
}

setupPanelToggle("#toggle-sidebar", "hide-sidebar");
setupPanelToggle("#toggle-details", "hide-details");

// --- Full-screen map ---

const fullscreenButton = document.querySelector("#fullscreen-btn");
const mapSection = document.querySelector(".map-section");

fullscreenButton.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }

  if (mapSection.requestFullscreen) {
    mapSection.requestFullscreen().catch(() => {
      alert("Full-screen mode is not available in this browser.");
    });
  }
});

document.addEventListener("fullscreenchange", () => {
  const active = Boolean(document.fullscreenElement);

  fullscreenButton.classList.toggle("is-active", active);
  fullscreenButton.setAttribute(
    "aria-label",
    active ? "Exit full-screen map" : "Full-screen map",
  );

  smoothMapResize();
});

// ==========================================
// 15. APPLICATION INITIALISATION
// ==========================================

async function initialiseApplication() {
  console.log("--------------------------------");
  console.log("OMI-EKO PMOD INITIALIZED");
  console.log("Loading actual QGIS analysis data...");
  console.log("--------------------------------");

  // Load actual terminal coordinates and thematic attributes.

  const terminalResult = await loadTerminalData();

  // Load actual ferry route geometries.

  const routeResult = await loadRouteData();

  // Load surrounding road network.

  await loadRoadData();

  // Load rail and BRT data.

  await loadTransportData();

  // Apply road visibility settings.

  updateRoadVisibility();

  // Fit the map to actual ferry terminal and route extents.

  const boundsGroup = L.featureGroup();

  if (terminalResult) {
    boundsGroup.addLayer(terminalResult);
  }

  if (routeResult) {
    boundsGroup.addLayer(routeResult);
  }

  const bounds = boundsGroup.getBounds();

  if (bounds.isValid()) {
    initialMapBounds = bounds;

    map.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: 12,
    });
  }

  setTimeout(() => {
    map.invalidateSize();
  }, 300);

  console.log("--------------------------------");
  console.log("OMI-EKO PMOD DATA LOADING COMPLETE");
  console.log(
    "Actual terminal features:",
    terminalGeoJSON?.features?.length ?? 0,
  );
  console.log("--------------------------------");
}

initialiseApplication();
