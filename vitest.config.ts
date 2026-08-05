import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";

// Standalone Vitest config, deliberately not reusing vite.config.ts: that
// config's TanStack Start/Nitro plugins target building and serving the
// real app, not running unit tests, and pulling them into the test runner
// would couple test startup to SSR/deploy-preset concerns tests don't need.
export default defineConfig({
  // Dummy but well-formed values so src/lib/supabase-client.ts's
  // "missing env var" guard doesn't throw on import in tests that pull it
  // in transitively (e.g. via auth-context.tsx) but don't care about real
  // Supabase config -- no network call is made unless a test actually
  // invokes an auth.* method, and tests that need specific auth behavior
  // mock supabase-client.ts directly rather than relying on these.
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("test-anon-key"),
  },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
  },
  plugins: [viteReact(), tsConfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Playwright's e2e/*.spec.ts files use the same *.spec.ts convention
    // as Vitest's default include pattern -- scope to src/ explicitly so
    // Vitest doesn't try (and fail) to run Playwright's `test` API.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
