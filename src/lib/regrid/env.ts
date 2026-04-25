const trim = (v: string | undefined) => (v ?? "").trim();

/**
 * Mapbox public token for the browser.
 * Prefer Vite's `VITE_*` prefix so values are injected from `.env.local`.
 * `VITE_PUBLIC_*` is supported for parity with other stacks.
 */
export function getPublicMapboxTokenFromEnv(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  const t =
    trim(env.VITE_MAPBOX_TOKEN) ||
    trim(env.VITE_PUBLIC_MAPBOX_TOKEN) ||
    trim(env.NEXT_PUBLIC_MAPBOX_TOKEN);
  return t || undefined;
}

/** Convex deployment URL (public). */
export function getConvexUrlFromEnv(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  const u =
    trim(env.VITE_CONVEX_URL) ||
    trim(env.VITE_PUBLIC_CONVEX_URL) ||
    trim(env.NEXT_PUBLIC_CONVEX_URL);
  return u || undefined;
}
