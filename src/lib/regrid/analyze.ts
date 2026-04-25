import type { AnalysisResult, BuiltinLayerId, Conflict, DrawnShape, LayerDef, LayerId } from "./types";
import { LAYERS } from "./layers";
import { distanceMeters } from "./geo";

// Point-in-polygon (ray casting) on lng/lat; fine for mock analysis.
function pointInRing(pt: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    const intersect =
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonCentroid(coords: number[][]): [number, number] {
  let x = 0,
    y = 0;
  for (const c of coords) {
    x += c[0];
    y += c[1];
  }
  return [x / coords.length, y / coords.length];
}

const BUILTIN_LAYER_LABELS: Record<BuiltinLayerId, { hit: string; near: string }> = {
  "hifld-transmission": {
    hit: "Transmission corridor overlap",
    near: "Close to high-voltage transmission",
  },
  "eia-grid": {
    hit: "Grid infrastructure overlap",
    near: "Near substation / switchyard footprint",
  },
  "usda-wildfire": {
    hit: "High wildfire exposure overlap",
    near: "Wildfire risk within buffer distance",
  },
  "epa-ejscreen": {
    hit: "Equity-priority area overlap",
    near: "Equity-priority area nearby (buffer)",
  },
  "power-plants": {
    hit: "Power plant footprint overlap",
    near: "Near existing power plant facilities",
  },
};

function labelsForLayer(id: LayerId): { hit: string; near: string } {
  if (id in BUILTIN_LAYER_LABELS) return BUILTIN_LAYER_LABELS[id as BuiltinLayerId];
  return {
    hit: "Imported dataset overlap",
    near: "Near imported dataset feature",
  };
}

function bufferMetersForLayer(id: LayerId): number {
  if (id.startsWith("ext:")) return 15000;
  if (id === "usda-wildfire") return 25000;
  if (id === "epa-ejscreen") return 18000;
  if (id === "power-plants") return 14000;
  return 9000;
}

function eachPolygonExterior(geometry: GeoJSON.Geometry, visit: (ring: number[][]) => void): void {
  if (geometry.type === "Polygon") {
    visit(geometry.coordinates[0] as number[][]);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      visit(poly[0] as number[][]);
    }
  }
}

export function analyzeShape(
  shape: DrawnShape,
  enabled: Set<LayerId>,
  allLayers: LayerDef[] = LAYERS,
): AnalysisResult {
  const conflicts: Conflict[] = [];
  let score = 0; // Starts at 0, penalty based

  for (const layer of allLayers) {
    if (!enabled.has(layer.id)) continue;
    for (const f of layer.geojson.features) {
      let intersects = false;
      let dist = Infinity;
      const geometry = f.geometry;
      if (!geometry) continue;
      if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
        eachPolygonExterior(geometry, (ring) => {
          const centroid = polygonCentroid(ring);
          const d = distanceMeters(shape.center, centroid as [number, number]);
          dist = Math.min(dist, d);
          if (pointInRing(shape.center, ring)) intersects = true;
        });
      } else if (geometry.type === "Point") {
        const pt = geometry.coordinates as [number, number];
        dist = distanceMeters(shape.center, pt);
        intersects = dist < Math.max(700, shape.radiusMeters * 0.55);
      } else {
        continue;
      }
      const buffer = bufferMetersForLayer(layer.id);
      const labels = labelsForLayer(layer.id);

      if (intersects) {
        conflicts.push({
          id: `${layer.id}-${conflicts.length}`,
          label: labels.hit,
          severity:
            layer.id === "usda-wildfire" || layer.id === "epa-ejscreen" || layer.id.startsWith("ext:")
              ? "high"
              : "medium",
          layerId: layer.id,
          detail: `${(f.properties as Record<string, string>)?.name ?? "Selected area"} — overlap`,
        });
        score +=
          layer.id === "usda-wildfire"
            ? 32
            : layer.id === "epa-ejscreen"
              ? 28
              : layer.id === "power-plants"
                ? 14
                : layer.id.startsWith("ext:")
                  ? 24
                  : 18;
      } else if (dist < buffer) {
        conflicts.push({
          id: `${layer.id}-${conflicts.length}`,
          label: labels.near,
          severity: dist < buffer / 2 ? "medium" : "low",
          layerId: layer.id,
          detail: `${(f.properties as Record<string, string>)?.name ?? "Nearby feature"} — ${(dist / 1000).toFixed(1)} km away`,
        });
        score += layer.id === "hifld-transmission" ? 6 : layer.id === "power-plants" ? 8 : layer.id.startsWith("ext:") ? 9 : 10;
      }
    }
  }

  const rank = (s: Conflict["severity"]) => (s === "high" ? 3 : s === "medium" ? 2 : 1);

  // De-dupe by label, keeping highest severity
  const dedup = new Map<string, Conflict>();
  for (const c of conflicts) {
    const prev = dedup.get(c.label);
    if (!prev) dedup.set(c.label, c);
    else if (rank(c.severity) > rank(prev.severity)) dedup.set(c.label, c);
  }

  return {
    score: Math.min(100, Math.round(score)),
    conflicts: Array.from(dedup.values()).slice(0, 5),
  };
}

// Genuine grid-search relocator to find lowest conflict score
export function findOptimalRelocation(
  shape: DrawnShape,
  enabled: Set<LayerId>,
  allLayers: LayerDef[] = LAYERS,
): { center: [number, number]; result: AnalysisResult } {
  let best = { center: shape.center, result: analyzeShape(shape, enabled, allLayers) };
  // Expanding search outward up to larger distances (e.g. ~100km)
  const stepsDeg = [0.05, 0.1, 0.2, 0.4, 0.6, 0.9, 1.2, 1.5];
  for (const r of stepsDeg) {
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      const candidateCenter: [number, number] = [
        shape.center[0] + Math.cos(rad) * r,
        shape.center[1] + Math.sin(rad) * r * 0.85,
      ];
      const candidate = { ...shape, center: candidateCenter };
      const res = analyzeShape(candidate, enabled, allLayers);
      if (res.score < best.result.score) {
        best = { center: candidateCenter, result: res };
        if (res.score === 0) return best; // Perfect site found
      }
    }
  }
  return best;
}
