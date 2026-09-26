# AGENTS.md — PlaceMe / placeme-UI

Single instruction file for every coding agent (Claude Code, Codex, Copilot).
`CLAUDE.md` only imports this file.

## What this is

PlaceMe is an on-demand practice arena for engineering students preparing for
campus placements. v1 is **GD Arena — Multiplayer**: students join a live voice
group discussion, get per-speaker transcription, and receive individual AI
feedback. This repo is the **canonical web frontend**. All data, auth rules,
migrations and the REST API live in the sibling backend repo **`gd-proto`**
(`apps/server`); this app has no server of its own beyond SSR/static hosting.
`expo-mobile/` is an early Expo shell, not shipped.

Deferred (do not build without explicit approval): AI voice practice, JAM,
aptitude/technical tests, roleplay interviews, drive simulator, payments,
notifications, a shipped mobile app.

## Stack

| Layer            | Tech                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| Runtime          | Node `22.23.1` (`.nvmrc`; engines `>=22.13.1 <23`), npm                           |
| Framework        | TanStack Start 1.x + TanStack Router (file routes) + React Query 5, React 19      |
| Build/host       | Vite 8 + Nitro (default preset `cloudflare-module`; override with `NITRO_PRESET`) |
| Language         | TypeScript 5.8 (typecheck in CI)                                                  |
| UI               | Tailwind CSS 4, Radix / shadcn/ui primitives, lucide-react                        |
| Forms/validation | react-hook-form + zod 3                                                           |
| Backend clients  | `@supabase/supabase-js` 2 (auth), `livekit-client` 2 (audio), PostHog (optional)  |
| API types        | `openapi-typescript` 7, generated from gd-proto's OpenAPI                         |
| Tests            | Vitest 3 + Testing Library (jsdom), Playwright 1.62                               |
| Lint/format      | ESLint 9 (typescript-eslint), Prettier 3                                          |
| Mobile (spike)   | Expo SDK 57, React Native 0.86 in `expo-mobile/`                                  |

## Commands (run from repo root)

```sh
npm ci                                 # install (use npm, not bun/pnpm)
cp .env.example .env.local             # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev                            # Vite dev server
npm test                               # Vitest unit/component tests
npm run test:watch                     # Vitest watch mode
npx tsc --noEmit                       # typecheck (CI)
npm run lint                           # ESLint
npm run format                         # Prettier --write
npx playwright install --with-deps chromium   # once
npm run test:e2e                       # Playwright (boots its own server on :8080, mocked backend)
npm run build                          # production build → .output/
npm run preview                        # serve the production build
```

- TS is `strict` with `noUncheckedIndexedAccess`: `arr[0]` is `T | undefined`,
  so use `arr[0]?.x` or assert first (bites mock `.calls[0][1]` in tests).
- Windows + `core.autocrlf=true`: `npm run lint` shows thousands of
  `Delete ␍` errors that CI (Linux, LF) never sees. Judge lint by
  `npx eslint <files> | grep -v ␍`, or set `core.autocrlf=input`.

**OpenAPI regen** (after a gd-proto API change is merged there):

```sh
npm run sync-contract          # copy ../gd-proto/docs/api/openapi.yaml → openapi/, stamp GD_PROTO_REF
npm run generate:api-types     # regenerate src/lib/api-types.generated.ts
npm run check:contract-drift   # what CI runs: generated types must match the vendored spec
```

`sync-contract` needs `gd-proto` cloned as a sibling (`../gd-proto`) with a
clean `docs/api/openapi.yaml`. Commit `openapi/*` and the generated file together.

**Migrations:** none in this repo. Schema and RLS changes go to
`gd-proto/supabase/migrations/` (forward-only, RLS in the same file — see
gd-proto's AGENTS.md).

**Mobile:** `cd expo-mobile && npm ci && npm start`. Expo has changed — read the
versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any
Expo code; don't rely on memory of older SDKs.

CI (`.github/workflows/ci.yml`, on PRs to `main`): typecheck, lint, test, e2e,
build, contract-drift. All must pass.

## Folder map

```
src/
  routes/          file-based routes (TanStack Router); __root.tsx is the only
                   root layout; see src/routes/README.md for naming rules
  routeTree.gen.ts auto-generated route tree — never edit
  components/pm/   design system: kit.tsx primitives, blocks.tsx domain blocks,
                   web-shell.tsx page chrome
  components/session/  LiveKit live-room integration
  components/ui/   shadcn/ui-derived primitives (used via components/pm)
  lib/             api.ts (typed API client), auth-context, supabase-client,
                   analytics, session/, consent + feature helpers
  lib/api-types.generated.ts  generated from openapi/ — never edit
openapi/           vendored gd-proto contract + GD_PROTO_REF (pinned commit)
scripts/           sync-contract.mjs, check-contract-drift.mjs
e2e/               Playwright specs + mocks.ts (network mocks, no real creds)
docs/              BACKEND_REQUIREMENTS.md (BE-N gaps referenced in routes)
expo-mobile/       Expo SDK 57 shell (not shipped)
```

## Conventions

- **Tests beside code:** `foo.ts` → `foo.test.ts` in the same folder. Route
  tests use a `-` prefix (`src/routes/-account.test.tsx`) so the router
  ignores them. E2E specs live in `e2e/` and mock the backend via `e2e/mocks.ts`.
- **TDD** for behavior changes; every bug fix gets a regression test. Never
  delete or weaken a valid test to get a pass.
- **API calls go through `src/lib/api.ts`** using types from
  `api-types.generated.ts`. No hand-written request/response types.
- **OpenAPI updated with API changes:** the contract changes in gd-proto first
  (`docs/api/openapi.yaml`, same PR as the route change); this repo then runs
  the OpenAPI regen steps above in its own PR and bumps `GD_PROTO_REF`.
- **Migrations are forward-only with RLS**, and live only in gd-proto. Never
  work around a missing policy from the client.
- UI is built from `components/pm` primitives; add to them rather than
  inlining new one-off styles.
- Backend gaps are recorded as `BE-N` in `docs/BACKEND_REQUIREMENTS.md` and
  referenced in route comments, not faked with demo data.
- One branch per task off `main`, PR to `main`, squash merge.
- Jobs are filed with `.github/ISSUE_TEMPLATE/job.md`; its "Done means" is the
  acceptance bar.

## Never do

- Never commit directly to `main`, force-push shared branches, or
  merge/approve a PR without an explicit request.
- Never hand-edit `src/routeTree.gen.ts` or `src/lib/api-types.generated.ts`,
  or edit `openapi/gd-proto.openapi.yaml` except via `npm run sync-contract`.
- Never call a backend endpoint that isn't in the vendored OpenAPI contract.
- Never put secrets in `VITE_*` vars (they ship to the browser) or commit
  `.env.local`; never print secret values from env files or dashboards.
- Never enable the microphone or join a LiveKit room before recorded consent.
- Never bypass auth guards (`protected-route`, `session-guard`) or write
  directly to Supabase tables from the client — writes go through gd-proto's API.
- Never mark room/audio/transcription/feedback work done on automated tests
  alone — real humans must verify it.
- Never create Next.js/Remix-style `src/pages/` or `app/layout.tsx`.
- Never skip hooks (`--no-verify`) or disable CI checks.
