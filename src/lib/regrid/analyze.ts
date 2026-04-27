import type { AnalysisResult, BuiltinLayerId, Conflict, DrawnShape, LayerDef, LayerId } from "./types";
import { LAYERS } from "./layers";
import { clampLngLatToCalifornia } from "./california";
import { buildShape, distanceMeters, siteFootprintRing } from "./geo";

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

function cross(ax: number, ay: number, bx: number, by: number) {
  return ax * by - ay * bx;
}

function onSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return Math.min(ax, bx) - 1e-12 <= px && px <= Math.max(ax, bx) + 1e-12 && Math.min(ay, by) - 1e-12 <= py && py <= Math.max(ay, by) + 1e-12;
}

/** Segment intersection (closed) for lng/lat space — adequate for small polygons in siting demo. */
function segmentsIntersect(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): boolean {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [cx, cy] = c;
  const [dx, dy] = d;
  const o1 = cross(bx - ax, by - ay, cx - ax, cy - ay);
  const o2 = cross(bx - ax, by - ay, dx - ax, dy - ay);
  const o3 = cross(dx - cx, dy - cy, ax - cx, ay - cy);
  const o4 = cross(dx - cx, dy - cy, bx - cx, by - cy);
  const eps = 1e-12;
  if (Math.abs(o1) < eps && onSegment(cx, cy, ax, ay, bx, by)) return true;
  if (Math.abs(o2) < eps && onSegment(dx, dy, ax, ay, bx, by)) return true;
  if (Math.abs(o3) < eps && onSegment(ax, ay, cx, cy, dx, dy)) return true;
  if (Math.abs(o4) < eps && onSegment(bx, by, cx, cy, dx, dy)) return true;
  return (o1 > eps) !== (o2 > eps) && (o3 > eps) !== (o4 > eps);
}

/**
 * True if the site footprint polygon meaningfully intersects the hazard ring:
 * any site vertex inside hazard, hazard vertex inside site, anchor inside hazard,
 * or a site edge crossing a hazard edge.
 */
function footprintOverlapsRing(siteRing: [number, number][], hazardRing: number[][], center: [number, number]): boolean {
  if (siteRing.length < 3 || hazardRing.length < 4) return false;

  const siteClosed: number[][] = [...siteRing.map((p) => [p[0], p[1]]), [siteRing[0][0], siteRing[0][1]]];

  for (const p of siteRing) {
    if (pointInRing(p, hazardRing)) return true;
  }
  if (pointInRing(center, hazardRing)) return true;

  for (let i = 0; i < hazardRing.length - 1; i++) {
    const hv: [number, number] = [hazardRing[i][0], hazardRing[i][1]];
    if (pointInRing(hv, siteClosed)) return true;
  }

  for (let i = 0; i < siteRing.length; i++) {
    const j = (i + 1) % siteRing.length;
    const a = siteRing[i];
    const b = siteRing[j];
    for (let k = 0; k < hazardRing.length - 1; k++) {
      const c: [number, number] = [hazardRing[k][0], hazardRing[k][1]];
      const d: [number, number] = [hazardRing[k + 1][0], hazardRing[k + 1][1]];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

function distancePointToSegmentMeters(p: [number, number], a: [number, number], b: [number, number]): number {
  const ax = a[0],
    ay = a[1];
  const bx = b[0],
    by = b[1];
  const px = p[0],
    py = p[1];
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  let t = ab2 > 0 ? (apx * abx + apy * aby) / ab2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * abx;
  const qy = ay + t * aby;
  return distanceMeters(p, [qx, qy]);
}

/** Minimum geodesic distance from point to a closed ring boundary (meters). */
function distancePointToRingBoundaryMeters(p: [number, number], ring: number[][]): number {
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = [ring[i][0], ring[i][1]] as [number, number];
    const b = [ring[i + 1][0], ring[i + 1][1]] as [number, number];
    best = Math.min(best, distancePointToSegmentMeters(p, a, b));
  }
  return best;
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
  const siteRing = siteFootprintRing(shape);

  for (const layer of allLayers) {
    if (!enabled.has(layer.id)) continue;
    for (const f of layer.geojson.features) {
      let intersects = false;
      let dist = Infinity;
      const geometry = f.geometry;
      if (!geometry) continue;
      if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
        eachPolygonExterior(geometry, (ring) => {
          const overlap =
            siteRing.length >= 3 ? footprintOverlapsRing(siteRing, ring, shape.center) : pointInRing(shape.center, ring);
          const dCenter = distancePointToRingBoundaryMeters(shape.center, ring);
          let dVerts = Infinity;
          for (const v of siteRing) {
            dVerts = Math.min(dVerts, distancePointToRingBoundaryMeters(v, ring));
          }
          const d = Math.min(dCenter, dVerts);
          dist = Math.min(dist, d);
          if (overlap) intersects = true;
        });
      } else if (geometry.type === "Point") {
        const pt = geometry.coordinates as [number, number];
        const hitR = Math.max(450, shape.radiusMeters * 0.5);
        const dCenter = distanceMeters(shape.center, pt);
        let dMin = dCenter;
        for (const v of siteRing) {
          dMin = Math.min(dMin, distanceMeters(v, pt));
        }
        dist = dMin;
        intersects = dMin < hitR;
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
          detail: `${(f.properties as Record<string, string>)?.name ?? "Selected area"} — footprint overlap`,
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
    conflicts: Array.from(dedup.values()).slice(0, 12),
  };
}

export interface FindRelocationOptions {
  /** Euclidean degree distance from seed; omit for full statewide search (manual Optimize). */
  maxOffsetDeg?: number;
}

function offsetDegFrom(a: [number, number], b: [number, number]): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

// Grid-search relocator for lowest conflict score; optional cap keeps copilot "near X" honest.
export function findOptimalRelocation(
  shape: DrawnShape,
  enabled: Set<LayerId>,
  allLayers: LayerDef[] = LAYERS,
  options?: FindRelocationOptions,
): { center: [number, number]; result: AnalysisResult } {
  const origin = clampLngLatToCalifornia(shape.center);
  const originShape = buildShape(shape.kind, origin, shape.radiusMeters, shape.id);
  let best = { center: origin, result: analyzeShape(originShape, enabled, allLayers) };
  const cap = options?.maxOffsetDeg;
  // Expanding search outward, staying inside California (and inside cap when set).
  const stepsDeg = [0.05, 0.1, 0.2, 0.4, 0.6, 0.9, 1.2, 1.5];
  for (const r of stepsDeg) {
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      const raw: [number, number] = [
        origin[0] + Math.cos(rad) * r,
        origin[1] + Math.sin(rad) * r * 0.85,
      ];
      const candidateCenter = clampLngLatToCalifornia(raw);
      if (cap !== undefined && offsetDegFrom(origin, candidateCenter) > cap + 1e-9) continue;
      const candidate = buildShape(shape.kind, candidateCenter, shape.radiusMeters, `${shape.id}-reloc-${r}-${a}`);
      const res = analyzeShape(candidate, enabled, allLayers);
      if (res.score < best.result.score) {
        best = { center: candidateCenter, result: res };
        if (res.score === 0) return best; // Perfect site found
      }
    }
  }
  return { center: clampLngLatToCalifornia(best.center), result: best.result };
}
