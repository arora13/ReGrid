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

export type LayerId =
  | "hifld-transmission"
  | "eia-grid"
  | "usda-wildfire"
  | "epa-ejscreen";

export interface LayerDef {
  id: LayerId;
  name: string;
  agency: string;
  color: string; // hex
  geojson: GeoJSON.FeatureCollection;
}
