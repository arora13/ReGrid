import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AnalysisResult, Conflict } from "./types";

/**
 * Fixed federal / state ArcGIS endpoints (no dynamic loops — exactly three POSTs per call).
 * URLs verified 2026-04; OEHHA publishes CES 4.0 here; CGS publishes AP zones; FWS publishes critical habitat.
 */
const CGS_ALQUIST_PRIOLO_QUERY =
  "https://services2.arcgis.com/zr3KAIbsRSUyARHG/arcgis/rest/services/CGS_Alquist_Priolo_Fault_Zones/FeatureServer/0/query";

const CALENVIROSCREEN_40_QUERY =
  "https://services1.arcgis.com/PCHfdHz4GlDNAhBb/arcgis/rest/services/CalEnviroScreen_4_0_Results_/FeatureServer/0/query";

const USFWS_CRITICAL_HABITAT_FINAL_QUERY =
  "https://services.arcgis.com/QVENGdaPbd4LUkLV/ArcGIS/rest/services/USFWS_Critical_Habitat/FeatureServer/0/query";

const ringSchema = z.array(z.array(z.number()).length(2)).min(3).max(400);

const federalScreenInputSchema = z.object({
  /** Outer ring of the site polygon in WGS84, closed or open (we close it). */
  ring: ringSchema,
});

export type FederalScreenSnapshot = {
  alquistPrioloFeatureCount: number;
  calEnviroscreenTractCount: number;
  usfwsCriticalHabitatFinalCount: number;
  /** True if one or more ArcGIS calls failed (counts may be partial zeros). */
  partial: boolean;
};

function realScreeningEnabled(): boolean {
  if (typeof process === "undefined") return true;
  const v = process.env.REAL_DATASET_SCREENING?.trim().toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

function closeRing(ring: number[][]): [number, number][] {
  const pts = ring as [number, number][];
  if (pts.length < 3) return pts;
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  if (a[0] === b[0] && a[1] === b[1]) return pts;
  return [...pts, a];
}

async function arcgisIntersectCount(
  queryUrl: string,
  rings: number[][][],
  signal: AbortSignal | undefined,
): Promise<number> {
  const geometry = JSON.stringify({
    rings,
    spatialReference: { wkid: 4326 },
  });
  const body = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometry,
    geometryType: "esriGeometryPolygon",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnCountOnly: "true",
  });
  const res = await fetch(queryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal,
  });
  if (!res.ok) throw new Error(`arcgis_http_${res.status}`);
  const data = (await res.json()) as { count?: number; error?: { message?: string } };
  if (typeof data.count === "number") return data.count;
  if (data.error?.message) throw new Error(data.error.message);
  throw new Error("arcgis_bad_response");
}

/**
 * BlueDocs-style pass: exactly **three** ArcGIS `returnCountOnly` queries in parallel (one per dataset).
 * No grid, no retries, no LLM.
 */
export const federalScreenFootprintFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => federalScreenInputSchema.parse(d))
  .handler(async ({ data }): Promise<FederalScreenSnapshot> => {
    if (!realScreeningEnabled()) {
      return {
        alquistPrioloFeatureCount: 0,
        calEnviroscreenTractCount: 0,
        usfwsCriticalHabitatFinalCount: 0,
        partial: false,
      };
    }

    const closed = closeRing(data.ring);
    const rings = [closed.map(([lng, lat]) => [lng, lat])];
    const signal = AbortSignal.timeout(14_000);

    let partial = false;
    const safeCount = async (url: string): Promise<number> => {
      try {
        return await arcgisIntersectCount(url, rings, signal);
      } catch {
        partial = true;
        return 0;
      }
    };

    const [alquistPrioloFeatureCount, calEnviroscreenTractCount, usfwsCriticalHabitatFinalCount] =
      await Promise.all([
        safeCount(CGS_ALQUIST_PRIOLO_QUERY),
        safeCount(CALENVIROSCREEN_40_QUERY),
        safeCount(USFWS_CRITICAL_HABITAT_FINAL_QUERY),
      ]);

    return {
      alquistPrioloFeatureCount,
      calEnviroscreenTractCount,
      usfwsCriticalHabitatFinalCount,
      partial,
    };
  });

function pushConflict(conflicts: Conflict[], c: Conflict, score: number, bump: number) {
  conflicts.push(c);
  return Math.min(100, score + bump);
}

/**
 * Merges federal / state screening into the local mock analysis (lower score is better).
 */
export function mergeFederalScreenIntoAnalysis(
  base: AnalysisResult,
  snap: FederalScreenSnapshot,
): AnalysisResult {
  const conflicts: Conflict[] = [...base.conflicts];
  let score = base.score;

  if (snap.alquistPrioloFeatureCount > 0) {
    score = pushConflict(
      conflicts,
      {
        id: "federal-cgs-ap",
        label: "CGS Alquist–Priolo earthquake fault zone",
        severity: "high",
        layerId: "ext:federal:cgs-ap",
        detail: `Footprint intersects ${snap.alquistPrioloFeatureCount} mapped fault-zone feature(s) (CA Geological Survey). Disclosure / study triggers likely — not a permit decision.`,
      },
      score,
      26,
    );
  }

  if (snap.usfwsCriticalHabitatFinalCount > 0) {
    score = pushConflict(
      conflicts,
      {
        id: "federal-fws-ch",
        label: "USFWS final critical habitat",
        severity: "high",
        layerId: "ext:federal:fws-ch",
        detail: `Footprint intersects ${snap.usfwsCriticalHabitatFinalCount} final critical habitat polygon(s). CEQA / ESA consultation path likely — screening only.`,
      },
      score,
      22,
    );
  }

  if (snap.calEnviroscreenTractCount > 0) {
    score = pushConflict(
      conflicts,
      {
        id: "federal-ces4",
        label: "CalEnviroScreen 4.0 community context",
        severity: "medium",
        layerId: "ext:federal:ces4",
        detail: `Footprint overlaps ${snap.calEnviroscreenTractCount} CES 4.0 result tract(s) (OEHHA). Review percentile / grant & permitting context in the official tool — not excluded by default.`,
      },
      score,
      12,
    );
  }

  if (snap.partial) {
    score = pushConflict(
      conflicts,
      {
        id: "federal-screen-partial",
        label: "Federal screening incomplete",
        severity: "low",
        layerId: "ext:federal:screen-meta",
        detail:
          "One or more ArcGIS checks failed over the network. Mock layers still apply; re-run analysis to retry.",
      },
      score,
      4,
    );
  }

  return { score, conflicts };
}
