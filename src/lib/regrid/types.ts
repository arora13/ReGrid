export type ShapeKind = "circle" | "square" | "hexagon";

export interface DrawnShape {
  id: string;
  kind: ShapeKind;
  center: [number, number]; // [lng, lat]
  radiusMeters: number;
  geojson: GeoJSON.Feature<GeoJSON.Polygon>;
}

export interface Conflict {
  id: string;
  label: string;
  severity: "high" | "medium" | "low";
  layerId: LayerId;
  detail: string;
}

export interface AnalysisResult {
  score: number; // 0-100, lower is better
  conflicts: Conflict[];
}

/** Core demo layers shipped in the repo */
export type BuiltinLayerId =
  | "hifld-transmission"
  | "eia-grid"
  | "usda-wildfire"
  | "epa-ejscreen"
  | "power-plants";

/** Optional layers loaded at runtime from `public/datasets/manifest.json` (ids must start with `ext:`). */
export type LayerId = BuiltinLayerId | `ext:${string}`;

export interface LayerDef {
  id: LayerId;
  name: string;
  agency: string;
  color: string; // hex
  geojson: GeoJSON.FeatureCollection;
}
