import type { LayerDef } from "./types";
import powerPlantsRaw from "@/data/power-plants.geojson?raw";

// Mock federal datasets — distributed across U.S. regions for a national demo.
// Pure simulated GeoJSON.
const NCAL: [number, number] = [-121.5, 39.0]; // NorCal
const CCAL: [number, number] = [-119.4, 36.8]; // Central
const SCAL: [number, number] = [-116.2, 34.0]; // SoCal
const POWER_PLANTS = JSON.parse(powerPlantsRaw) as GeoJSON.FeatureCollection;

function ring(
  center: [number, number],
  rxDeg: number,
  ryDeg: number,
  steps = 48,
  rotation = 0,
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.cos(a) * rxDeg;
    const y = Math.sin(a) * ryDeg;
    const xr = x * Math.cos(rotation) - y * Math.sin(rotation);
    const yr = x * Math.sin(rotation) + y * Math.cos(rotation);
    coords.push([center[0] + xr, center[1] + yr]);
  }
  coords.push(coords[0]);
  return coords;
}

function polygon(coords: [number, number][], props: Record<string, unknown> = {}): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: props,
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

function lineCorridor(
  start: [number, number],
  end: [number, number],
  widthDeg: number,
  props: Record<string, unknown> = {},
): GeoJSON.Feature {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const coords: [number, number][] = [
    [start[0] + nx * widthDeg, start[1] + ny * widthDeg],
    [end[0] + nx * widthDeg, end[1] + ny * widthDeg],
    [end[0] - nx * widthDeg, end[1] - ny * widthDeg],
    [start[0] - nx * widthDeg, start[1] - ny * widthDeg],
  ];
  coords.push(coords[0]);
  return polygon(coords, props);
}

export const LAYERS: LayerDef[] = [
  {
    id: "hifld-transmission",
    name: "HIFLD Electric Transmission Lines",
    agency: "DHS · HIFLD",
    color: "#38bdf8",
    geojson: {
      type: "FeatureCollection",
      features: [
        lineCorridor([SCAL[0] - 1.6, SCAL[1] - 0.4], [SCAL[0] + 1.8, SCAL[1] + 0.6], 0.012, {
          name: "Mojave 500kV Corridor",
        }),
        lineCorridor([SCAL[0] - 0.9, SCAL[1] + 0.9], [SCAL[0] + 1.2, SCAL[1] - 1.1], 0.01, {
          name: "Eldorado–Crystal 230kV",
        }),
        lineCorridor([SCAL[0] + 0.4, SCAL[1] - 1.4], [SCAL[0] + 1.6, SCAL[1] + 1.3], 0.009, {
          name: "Pisgah Tap Line",
        }),
        lineCorridor([CCAL[0] - 1.9, CCAL[1] + 0.2], [CCAL[0] + 2.1, CCAL[1] - 0.3], 0.012, {
          name: "Central 345kV Corridor",
        }),
        lineCorridor([NCAL[0] - 1.3, NCAL[1] - 0.9], [NCAL[0] + 1.6, NCAL[1] + 0.7], 0.01, {
          name: "NorCal Intertie 230kV",
        }),
      ],
    },
  },
  {
    id: "eia-grid",
    name: "EIA Grid Infrastructure",
    agency: "U.S. Energy Information Admin.",
    color: "#60a5fa",
    geojson: {
      type: "FeatureCollection",
      features: [
        polygon(ring([SCAL[0] - 0.8, SCAL[1] + 0.2], 0.18, 0.13), { name: "Substation Cluster A" }),
        polygon(ring([SCAL[0] + 0.6, SCAL[1] - 0.7], 0.14, 0.11), { name: "Switchyard B" }),
        polygon(ring([SCAL[0] + 1.4, SCAL[1] + 0.5], 0.16, 0.12), { name: "Generation Node C" }),
        polygon(ring([CCAL[0] - 0.6, CCAL[1] + 0.4], 0.2, 0.14), { name: "Substation Cluster D" }),
        polygon(ring([NCAL[0] + 0.9, NCAL[1] - 0.2], 0.17, 0.13), { name: "Switchyard E" }),
      ],
    },
  },
  {
    id: "usda-wildfire",
    name: "USDA Wildfire Risk Zones",
    agency: "USDA Forest Service",
    color: "#fb923c",
    geojson: {
      type: "FeatureCollection",
      features: [
        polygon(ring([SCAL[0] - 0.4, SCAL[1] - 0.3], 0.55, 0.42, 64, 0.3), {
          name: "High Risk Zone — Mojave East",
          risk: "high",
        }),
        polygon(ring([SCAL[0] + 1.1, SCAL[1] + 0.9], 0.4, 0.32, 64, -0.4), {
          name: "Moderate Risk — Spring Mtn",
          risk: "moderate",
        }),
        polygon(ring([CCAL[0] + 0.2, CCAL[1] - 0.2], 0.52, 0.36, 64, -0.2), {
          name: "High Risk Zone — Central Valley",
          risk: "high",
        }),
        polygon(ring([NCAL[0] - 0.5, NCAL[1] + 0.5], 0.35, 0.26, 64, 0.15), {
          name: "Moderate Risk — Sierra Nevada",
          risk: "moderate",
        }),
      ],
    },
  },
  {
    id: "epa-ejscreen",
    name: "EPA EJScreen Disadvantaged Communities",
    agency: "EPA EJScreen",
    color: "#c4b5fd",
    geojson: {
      type: "FeatureCollection",
      features: [
        polygon(ring([SCAL[0] - 1.3, SCAL[1] + 0.6], 0.22, 0.18, 48, 0.2), {
          name: "Census Tract 4801 — Disadvantaged",
        }),
        polygon(ring([SCAL[0] + 0.2, SCAL[1] + 1.0], 0.2, 0.16, 48, -0.5), {
          name: "Census Tract 9904 — Disadvantaged",
        }),
        polygon(ring([SCAL[0] + 1.6, SCAL[1] - 0.9], 0.24, 0.18, 48, 0.6), {
          name: "Census Tract 7712 — Disadvantaged",
        }),
        polygon(ring([CCAL[0] - 1.0, CCAL[1] + 0.8], 0.22, 0.17, 48, -0.15), {
          name: "Census Tract 6621 — Disadvantaged",
        }),
        polygon(ring([NCAL[0] + 0.7, NCAL[1] - 0.6], 0.23, 0.17, 48, 0.22), {
          name: "Census Tract 4217 — Disadvantaged",
        }),
      ],
    },
  },
  {
    id: "power-plants",
    name: "Power Plant Facilities",
    agency: "Discord dataset upload",
    color: "#22d3ee",
    geojson: POWER_PLANTS,
  },
];

export const INITIAL_VIEW = {
  center: [-119.4179, 36.7783] as [number, number],
  zoom: 5.8,
};
