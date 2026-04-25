import { getStartContext } from "@tanstack/start-storage-context";

/** Best-effort client id for rate limiting (single shared bucket if unavailable). */
export function anthropicRateLimitClientKey(): string {
  try {
    const ctx = getStartContext({ throwIfNotFound: false });
    const req = ctx?.request;
    if (!req) return "unknown";
    return (
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function pruneWindow(ts: number[], windowMs: number, now: number) {
  while (ts.length > 0 && ts[0]! < now - windowMs) ts.shift();
}

/**
 * In-memory sliding window (per server isolate). One Anthropic call = one token.
 * Does not loop; call once per outbound API request.
 */
export function tryConsumeAnthropicRateToken(
  clientKey: string,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const rawWindow = typeof process !== "undefined" ? process.env.ANTHROPIC_RL_WINDOW_MS : undefined;
  const windowMs = Math.min(900_000, Math.max(10_000, parsePositiveInt(rawWindow, 60_000)));
  const perIpMax = parsePositiveInt(
    typeof process !== "undefined" ? process.env.ANTHROPIC_RL_PER_IP_MAX : undefined,
    8,
  );
  const globalMax = parsePositiveInt(
    typeof process !== "undefined" ? process.env.ANTHROPIC_RL_GLOBAL_MAX_PER_WINDOW : undefined,
    0,
  );

  const now = Date.now();

  if (globalMax > 0) {
    pruneWindow(globalHits, windowMs, now);
    if (globalHits.length >= globalMax) {
      return { ok: false, retryAfterSec: retryAfter(globalHits, windowMs, now) };
    }
  }

  let row = perIpHits.get(clientKey);
  if (!row) {
    row = [];
    perIpHits.set(clientKey, row);
  }
  pruneWindow(row, windowMs, now);
  if (row.length >= perIpMax) {
    return { ok: false, retryAfterSec: retryAfter(row, windowMs, now) };
  }

  row.push(now);
  if (globalMax > 0) globalHits.push(now);
  return { ok: true };
}

const perIpHits = new Map<string, number[]>();
const globalHits: number[] = [];

function retryAfter(ts: number[], windowMs: number, now: number): number {
  if (ts.length === 0) return 1;
  const waitMs = ts[0]! + windowMs - now;
  return Math.max(1, Math.ceil(waitMs / 1000));
}
