import { clampLngLatToCalifornia } from "./california";

/**
 * Reverse geocode coordinates → nearest place name string, e.g. "Woodland, California".
 * Returns null on failure or missing token.
 */
export async function reverseGeocode(
  lngLat: [number, number],
  accessToken: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!accessToken.trim()) return null;
  const [lng, lat] = lngLat;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${encodeURIComponent(accessToken)}&types=place,locality,neighborhood&limit=1`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { text?: string; place_name?: string }[];
    };
    const f = data.features?.[0];
    if (!f) return null;
    // "Woodland" → we append state context from place_name when available
    const text = f.text ?? "";
    const statePart = f.place_name?.split(",").slice(-2, -1)[0]?.trim() ?? "";
    return statePart ? `${text}, ${statePart}` : text || f.place_name || null;
  } catch {
    return null;
  }
}

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
