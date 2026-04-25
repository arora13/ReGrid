import type { DrawnShape, ShapeKind } from "./types";

const EARTH_RADIUS_M = 6378137;

// Build a polygon (GeoJSON) around a center point, in meters.
export function buildShape(
  kind: ShapeKind,
  center: [number, number],
  radiusMeters: number,
  id: string,
): DrawnShape {
  const sides = kind === "circle" ? 64 : kind === "hexagon" ? 6 : 4;
  const rotation = kind === "square" ? Math.PI / 4 : kind === "hexagon" ? Math.PI / 6 : 0;
  const coords: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    coords.push(offset(center, radiusMeters, angle));
  }
  coords.push(coords[0]);
  return {
    id,
    kind,
    center,
    radiusMeters,
    geojson: {
      type: "Feature",
      properties: { id, kind },
      geometry: { type: "Polygon", coordinates: [coords] },
    },
  };
}

function offset(center: [number, number], distance: number, bearingRad: number): [number, number] {
  const [lng, lat] = center;
  const dx = (distance * Math.cos(bearingRad)) / (EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180));
  const dy = (distance * Math.sin(bearingRad)) / EARTH_RADIUS_M;
  return [lng + (dx * 180) / Math.PI, lat + (dy * 180) / Math.PI];
}

export function distanceMeters(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** First linear ring of the site footprint (GeoJSON polygon), without duplicate closing vertex. */
export function siteFootprintRing(shape: DrawnShape): [number, number][] {
  const coords = shape.geojson.geometry?.coordinates?.[0];
  if (!coords?.length) return [];
  const out = coords.map((c) => [c[0], c[1]] as [number, number]);
  if (out.length >= 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) out.pop();
  }
  return out;
}
