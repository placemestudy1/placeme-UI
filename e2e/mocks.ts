import type { Page } from "@playwright/test";

// Navigates and waits for the network to go quiet, which in practice also
// means TanStack Start's client bundle has loaded and React has hydrated.
// Plain page.goto() only waits for the "load" event -- clicking a form's
// submit button before hydration attaches its onSubmit handler falls
// through to the browser's native (unhandled) form submit instead, which
// reloads the page with an empty query string rather than running any of
// this app's JS. Every spec navigates through this instead of page.goto
// directly so that failure mode can't come back.
export async function gotoReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle" });
}

// Shared mocking helpers for the e2e suite. This app talks to two real
// backends -- Supabase (auth) and gd-proto/apps/server (the REST API) --
// neither of which this suite stands up for real: playwright.config.ts
// points the dev server at fake origins (VITE_SUPABASE_URL/VITE_API_URL)
// that nothing is listening on, and every test intercepts the specific
// calls it needs via page.route() before the browser ever dials out. An
// unmocked call fails loudly (net::ERR_CONNECTION_REFUSED) rather than
// silently reaching a real service.

export const FAKE_USER_ID = "11111111-1111-4111-8111-111111111111";
export const FAKE_EMAIL = "aarav.menon@nitk.edu.in";

// Builds a GoTrue-shaped session response body -- the same flat shape
// (access_token/refresh_token/expires_in/user at the top level) that
// @supabase/auth-js's _sessionResponse() expects from both POST
// /auth/v1/token (sign in) and POST /auth/v1/signup, per
// node_modules/@supabase/auth-js/dist/main/lib/fetch.js.
export function fakeGoTrueSession(overrides: { id?: string; email?: string } = {}) {
  const id = overrides.id ?? FAKE_USER_ID;
  const email = overrides.email ?? FAKE_EMAIL;
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `fake-access-token-${id}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: `fake-refresh-token-${id}`,
    user: {
      id,
      aud: "authenticated",
      role: "authenticated",
      email,
      email_confirmed_at: new Date().toISOString(),
      phone: "",
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

// Intercepts Supabase's sign-in and sign-up endpoints so real
// supabase.auth.signInWithPassword()/signUp() calls (as used by
// src/lib/auth-context.tsx) resolve with a fake-but-correctly-shaped
// session instead of reaching a real Supabase project.
export async function mockSupabaseAuth(
  page: Page,
  overrides: { id?: string; email?: string } = {},
) {
  const session = fakeGoTrueSession(overrides);
  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }),
  );
  await page.route("**/auth/v1/signup*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }),
  );
  return session;
}

// Fulfils a single gd-proto REST endpoint (src/lib/api.ts's callApi
// targets) with a fixed JSON body, matched on path suffix + method so
// callers don't need to know VITE_API_URL's fake origin.
export async function mockApi(
  page: Page,
  path: string,
  body: unknown,
  options: { method?: string; status?: number } = {},
) {
  const { method = "GET", status = 200 } = options;
  await page.route(`**${path}`, (route) => {
    if (route.request().method() !== method) return route.fallback();
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
}
