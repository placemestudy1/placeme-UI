import { defineConfig, devices } from "@playwright/test";

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

// The dev server this config boots is deliberately pointed at fake
// Supabase/API origins -- every test intercepts the specific calls it
// needs via page.route() (see e2e/mocks.ts). reuseExistingServer is
// intentionally always false: reusing a developer's already-running
// `npm run dev` (booted against their real .env.local) would either mix
// real credentials into these mocked tests or 404 in ways that look like
// test bugs -- failing loudly on a port conflict is safer than that.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  // CI retries absorb a real, observed one-off: the very first request
  // against a freshly-booted dev server can trip Vite's on-demand
  // dependency pre-bundling for a newly-added package (e.g. posthog-js),
  // occasionally pushing the setup test past its timeout once. Re-running
  // hits Vite's now-warm `node_modules/.vite` cache and passes normally --
  // not a real bug, self-resolving after the first run on a given machine.
  retries: process.env["CI"] ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
        launchOptions: {
          // Auto-grants a fake mic device instead of showing a real OS
          // permission prompt -- needed for consent.spec.ts's
          // getUserMedia() call.
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: "https://mock.supabase.test",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
      VITE_API_URL: "http://localhost:4999",
    },
  },
});
