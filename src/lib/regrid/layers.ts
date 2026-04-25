import type { LayerDef } from "./types";

// Mock federal datasets — concentrated around the American Southwest
// (a typical solar/battery siting region). Pure simulated GeoJSON.
const SW: [number, number] = [-115.5, 35.8]; // anchor near NV/CA border

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
    color: "#22d3ee",
    geojson: {
      type: "FeatureCollection",
      features: [
        lineCorridor([SW[0] - 1.6, SW[1] - 0.4], [SW[0] + 1.8, SW[1] + 0.6], 0.012, {
          name: "Mojave 500kV Corridor",
        }),
        lineCorridor([SW[0] - 0.9, SW[1] + 0.9], [SW[0] + 1.2, SW[1] - 1.1], 0.01, {
          name: "Eldorado–Crystal 230kV",
        }),
        lineCorridor([SW[0] + 0.4, SW[1] - 1.4], [SW[0] + 1.6, SW[1] + 1.3], 0.009, {
          name: "Pisgah Tap Line",
        }),
      ],
    },
  },
  {
    id: "eia-grid",
    name: "EIA Grid Infrastructure",
    agency: "U.S. Energy Information Admin.",
    color: "#a78bfa",
    geojson: {
      type: "FeatureCollection",
      features: [
        polygon(ring([SW[0] - 0.8, SW[1] + 0.2], 0.18, 0.13), { name: "Substation Cluster A" }),
        polygon(ring([SW[0] + 0.6, SW[1] - 0.7], 0.14, 0.11), { name: "Switchyard B" }),
        polygon(ring([SW[0] + 1.4, SW[1] + 0.5], 0.16, 0.12), { name: "Generation Node C" }),
      ],
    },
  },
  {
    id: "usda-wildfire",
    name: "USDA Wildfire Risk Zones",
    agency: "USDA Forest Service",
    color: "#f97316",
    geojson: {
      type: "FeatureCollection",
      features: [
        polygon(ring([SW[0] - 0.4, SW[1] - 0.3], 0.55, 0.42, 64, 0.3), {
          name: "High Risk Zone — Mojave East",
          risk: "high",
        }),
        polygon(ring([SW[0] + 1.1, SW[1] + 0.9], 0.4, 0.32, 64, -0.4), {
          name: "Moderate Risk — Spring Mtn",
          risk: "moderate",
        }),
      ],
    },
  },
  {
    id: "epa-ejscreen",
    name: "EPA EJScreen Disadvantaged Communities",
    agency: "EPA EJScreen",
    color: "#f43f5e",
    geojson: {
      type: "FeatureCollection",
      features: [
        polygon(ring([SW[0] - 1.3, SW[1] + 0.6], 0.22, 0.18, 48, 0.2), {
          name: "Census Tract 4801 — Disadvantaged",
        }),
        polygon(ring([SW[0] + 0.2, SW[1] + 1.0], 0.2, 0.16, 48, -0.5), {
          name: "Census Tract 9904 — Disadvantaged",
        }),
        polygon(ring([SW[0] + 1.6, SW[1] - 0.9], 0.24, 0.18, 48, 0.6), {
          name: "Census Tract 7712 — Disadvantaged",
        }),
      ],
    },
  },
];

export const INITIAL_VIEW = {
  center: SW,
  zoom: 7.4,
};
