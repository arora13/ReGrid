import { clampLngLatToCalifornia } from "./california";

/**
 * Forward geocode a free-text place (Mapbox Geocoding API).
 * Returns null on network/parse failure or missing features.
 */
export async function geocodePlaceInCalifornia(
  query: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<[number, number] | null> {
  const q = query.trim();
  if (!q || !accessToken.trim()) return null;
  const path = encodeURIComponent(q);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json?access_token=${encodeURIComponent(accessToken)}&country=US&types=place,locality,neighborhood,region,postcode,address&limit=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { center?: [number, number] }[];
  };
  const c = data.features?.[0]?.center;
  if (!c || c.length < 2) return null;
  return clampLngLatToCalifornia([c[0], c[1]]);
}
