// Vite config for this TanStack Start app. Previously wrapped by
// @lovable.dev/vite-tanstack-config (Lovable's own editor/sandbox
// integration) -- rewritten here as a plain, hand-maintained config now that
// the project no longer uses Lovable's platform. This reproduces exactly
// the plugin set/options that wrapper applied outside its sandbox mode
// (its `isSandbox` branches -- HMR gate, dev-server bridge, asset proxy,
// sandbox-only build diagnostics -- only ever ran inside Lovable's own
// editor iframe and are dropped entirely, not replaced).
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { devtools } from "@tanstack/devtools-vite";

export default defineConfig(({ command, mode }) => {
  // Same VITE_*-only env injection the wrapper did, so `import.meta.env.VITE_X`
  // keeps working exactly as before.
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      // Keeps a single copy of these across the app + its dependencies --
      // duplicate React/TanStack Query instances break hooks and caching.
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: { host: "::", port: 8080 },
    plugins: [
      // Dev-only devtools panel -- disabled in production builds automatically
      // since this plugin is only added when mode === "development".
      ...(mode === "development"
        ? [
            devtools({
              logging: false,
              eventBusConfig: { enabled: false },
              enhancedLogs: { enabled: false },
              consolePiping: { enabled: false },
              removeDevtoolsOnBuild: false,
              injectSource: { enabled: true },
            }),
          ]
        : []),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
        // Redirect TanStack Start's bundled server entry to src/server.ts
        // (our SSR error wrapper) -- unchanged from the previous config.
        server: { entry: "server" },
      }),
      // Nitro only runs for production builds -- matches the previous
      // `command === "build"` gating -- and keeps the same Cloudflare
      // Workers deploy target this app already builds/deploys to
      // (wrangler.json/.output are generated from this preset).
      ...(command === "build" ? [nitro({ defaultPreset: "cloudflare-module" })] : []),
      viteReact(),
    ],
    // Debounces the dev-server file watcher so a burst of writes (e.g. an
    // editor autosave) doesn't trigger a flurry of partial HMR reloads --
    // same defaults the wrapper applied unconditionally outside its
    // sandbox mode.
    watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
  };
});
