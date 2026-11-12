
import "./style.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const app = document.querySelector("#app");

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

    <div class="topbar-status">
      <span class="status-dot"></span>
      LAGOS TRANSPORT NETWORK
    </div>
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
          <h3>Select a terminal</h3>
          <p>
            Click a terminal marker to view its analysis.
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

L.control.zoom({
  position: "bottomright",
}).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

let initialMapBounds = null;

// ==========================================
// 3. CREATE LAYER GROUPS
// ==========================================

const terminalLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);

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

const accessibilityClasses = [
  {
    min: 0.01,
    max: 0.15,
    label: "Very Low",
    color: "#d73027",
  },
  {
    min: 0.15,
    max: 0.29,
    label: "Low",
    color: "#fc8d59",
  },
  {
    min: 0.29,
    max: 0.43,
    label: "Moderate",
    color: "#fee08b",
  },
  {
    min: 0.43,
    max: 0.57,
    label: "High",
    color: "#91cf60",
  },
  {
    min: 0.57,
    max: 0.75,
    label: "Very High",
    color: "#1a9850",
  },
];

function getAccessibilityClass(value) {
  for (let i = 0; i < accessibilityClasses.length; i++) {
    const item = accessibilityClasses[i];

    if (
      value >= item.min &&
      (value <= item.max || i === accessibilityClasses.length - 1)
    ) {
      return item;
    }
  }

  return accessibilityClasses[0];
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

  const classification = getAccessibilityClass(index);

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
          <span>Accessibility</span>
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

async function loadTerminalData() {
  try {
    console.log("Loading actual terminal data...");

    const response = await fetch(
      "/data/analysis/Terminal_Analysis.geojson"
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

        const classification = getAccessibilityClass(index);

        return L.circleMarker(latlng, {
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

        const classification = getAccessibilityClass(index);

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
          }
        );

        layer.bindPopup(`
          <strong>${name}</strong>
          <hr>
          Spatial index: ${index.toFixed(2)}
          <br>
          Accessibility: ${classification.label}
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

      const classification = getAccessibilityClass(index);

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
           Accessibility: ${classification.label}`
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
           Passengers: ${passengers.toLocaleString()}`
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
           Catchment population: ${population.toLocaleString()}`
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
           Intersections: ${intersections.toLocaleString()}`
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
  const div = L.DomUtil.create("div", "info legend");

  div.style.background = "white";
  div.style.padding = "10px 12px";
  div.style.borderRadius = "6px";
  div.style.boxShadow = "0 1px 5px rgba(0,0,0,0.3)";
  div.style.fontSize = "12px";
  div.style.lineHeight = "22px";

  div.innerHTML = `
    <strong>TRANSPORT NETWORK ACCESSIBILITY</strong>
    <br>
    ${accessibilityClasses.map(item => `
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
        (${item.min.toFixed(2)}–${item.max.toFixed(2)})
      </div>
    `).join("")}
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
  "2": "#e00000",
  "3": "#8e44ad",
  "4": "#f39c12",
  "5": "#16a085",
  "6": "#e84393",
  "7": "#34495e",
  "8": "#d35400",
  "9": "#7f8c8d",
  "F1": "#2c3e50",
  "F2": "#c0392b",
  "F3": "#27ae60",
  "F5": "#2980b9",
  "F6": "#9b59b6",
  "F7": "#b8860b",
};

function getRouteCode(routeName) {
  const match = String(routeName || "").trim().match(/^(1A|1B|F[1-7]|[2-9])\b/);
  return match ? match[1] : null;
}

async function loadRouteData() {
  try {
    console.log("Loading actual ferry route geometries...");

    const response = await fetch(
      "/data/analysis/Route_Passenger_Analysis.geojson"
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const routeGeoJSON = L.geoJSON(data, {

      style: (feature) => {
        const p = feature.properties || {};
        const code = getRouteCode(p.Route_Name);

        return {
          color: routeColours[code] || "#333333",
          weight: 3,
          opacity: 0.85,
          lineCap: "round",
          lineJoin: "round",
        };
      },

      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};

        const routeName = p.Route_Name || "Ferry route";

        layer.bindTooltip(routeName, {
          sticky: true,
        });

        layer.bindPopup(`
          <strong>${routeName}</strong>
          <hr>
          Passengers: ${(Number(p.Passenger) || 0).toLocaleString()}
          <br>
          Distance saved: ${(Number(p.DistSav) || 0).toFixed(2)} km
          <br>
          Time saved: ${(Number(p.Time_save) || 0).toFixed(2)} minutes
          <br>
          Route index: ${(Number(p.Rout_index) || 0).toFixed(2)}
        `);
      },

    });

    routeGeoJSON.addTo(routeLayer);

    console.log("ACTUAL FERRY ROUTES LOADED");
    console.log("Route features:", data.features.length);

    return routeGeoJSON;

  } catch (error) {
    console.error("Ferry route loading failed:", error);
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
    })
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

        style: item.point ? undefined : {
          color: item.color,
          weight: item.weight,
          opacity: 0.9,
        },

        pointToLayer: item.point
          ? (feature, latlng) => L.circleMarker(latlng, {
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
            id !== undefined ? `${item.name} - ID ${id}` : item.name
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

  const allRoadsChecked =
    document.querySelector("#roads-toggle").checked;

  Object.keys(roadLayers).forEach((key) => {

    const individualChecked =
      document.querySelector(`#${roadCheckboxes[key]}`).checked;

    const shouldShow = allRoadsChecked || individualChecked;

    if (shouldShow) {
      roadLayers[key].addTo(map);
    } else {
      map.removeLayer(roadLayers[key]);
    }

  });
}

document.querySelector("#roads-toggle").addEventListener(
  "change",
  updateRoadVisibility
);

Object.values(roadCheckboxes).forEach((id) => {
  document.querySelector(`#${id}`).addEventListener(
    "change",
    updateRoadVisibility
  );
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
    "Unable to access your location. Check your browser location permission."
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
  console.log("Actual terminal features:",
    terminalGeoJSON?.features?.length ?? 0
  );
  console.log("--------------------------------");

}

initialiseApplication();
