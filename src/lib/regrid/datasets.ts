import type { LayerDef, LayerId } from "./types";

/**
 * Optional GeoJSON layers shipped beside the app (not bundled).
 *
 * 1. Put GeoJSON under `public/datasets/` (export from QGIS, ogr2ogr, etc.).
 * 2. Copy `manifest.example.json` → `manifest.json` and list your files.
 *
 * Gmail / private Google Drive links cannot be read from the browser here.
 * Large archives (e.g. PADUS KMZ ~439MB) must be converted locally to GeoJSON
 * (prefer simplified) before placing in `public/datasets/`.
 */
export type DatasetManifest = {
  layers: Array<{
    id: string;
    name: string;
    agency?: string;
    color?: string;
    geojsonUrl: string;
    hoverHelp?: string;
  }>;
};

function normalizeLayerId(raw: string): LayerId {
  const t = raw.trim();
  if (t.startsWith("ext:")) return t as LayerId;
  return `ext:${t.replace(/^ext_?/i, "")}` as LayerId;
}

function isFeatureCollection(x: unknown): x is GeoJSON.FeatureCollection {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as GeoJSON.FeatureCollection).type === "FeatureCollection" &&
    Array.isArray((x as GeoJSON.FeatureCollection).features)
  );
}

export async function loadManifestLayers(): Promise<LayerDef[]> {
  try {
    const res = await fetch("/datasets/manifest.json", { cache: "no-store" });
    if (!res.ok) return [];
    const manifest = (await res.json()) as DatasetManifest;
    const specs = manifest.layers ?? [];
    const out: LayerDef[] = [];

    for (const spec of specs) {
      if (!spec?.geojsonUrl || !spec?.name) continue;
      const gjRes = await fetch(spec.geojsonUrl, { cache: "no-store" });
      if (!gjRes.ok) continue;
      const data: unknown = await gjRes.json();
      if (!isFeatureCollection(data)) continue;

      const id = spec.id ? normalizeLayerId(spec.id) : (`ext:dataset-${out.length}` as LayerId);

      out.push({
        id,
        name: spec.name,
        agency: spec.agency ?? "External dataset",
        color: spec.color ?? "#84cc16",
        geojson: data,
        ...(spec.hoverHelp ? { hoverHelp: spec.hoverHelp } : {}),
      });
    }

    return out;
  } catch {
    return [];
  }
}
