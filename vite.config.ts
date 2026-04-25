// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    optimizeDeps: {
      include: ["mapbox-gl"],
    },
    server: {
      // Match common Vite expectations (this template defaulted to 8080, so bookmarks to :5173 404’d).
      port: 5173,
      strictPort: false,
      host: true,
      // Dev-only: stop stale-document / aggressive proxy caches from looking "unchanged" after edits
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  },
});
