# PlaceMe UI

The canonical web frontend for **PlaceMe** — a platform where engineering
students join live voice Group Discussions (GDs), collaborate in real time,
and receive AI-powered individual feedback after each session.

This app is the web client for [`gd-proto`](../gd-proto)'s backend (REST API
+ LiveKit audio + Supabase auth/data). It does not include a server of its
own beyond the SSR/static hosting layer.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19) + [TanStack
  Router](https://tanstack.com/router) — file-based routes under
  `src/routes/`.
- [Supabase](https://supabase.com) — auth (`src/lib/auth-context.tsx`,
  `src/lib/supabase-client.ts`).
- [LiveKit](https://livekit.io) client — live session audio
  (`src/components/session/live-room.tsx`).
- Tailwind CSS v4 + a small custom design-system layer
  (`src/components/pm/`: `kit.tsx` primitives, `blocks.tsx` domain
  components, `web-shell.tsx` page chrome).
- Vite + Nitro, deployed as a Cloudflare Worker by default (`vite.config.ts`
  sets `nitro({ defaultPreset: "cloudflare-module" })`); override with the
  `NITRO_PRESET` env var for other targets (e.g. Vercel).

## Development

Requires Node.js (see `engines.node` in `package.json`).

```sh
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

See `.env.example`. In short:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — from the Supabase
  project's dashboard under Project Settings → API. The anon/publishable
  key is safe to expose client-side.
- `VITE_API_URL` — the `gd-proto/apps/server` origin this app talks to
  (defaults to `http://localhost:3000` for local dev against a locally
  running backend).

### Other scripts

```sh
npm run build      # production build (writes .output/)
npm run preview    # preview a production build locally
npm run lint        # ESLint
npm run format      # Prettier --write
```

## Project structure

```
src/
  routes/       # file-based routes (TanStack Router) — the real, canonical app
  components/
    pm/         # design-system primitives (kit.tsx), domain blocks
                # (blocks.tsx), and page chrome (web-shell.tsx)
    session/    # LiveKit live-session integration
    ui/         # shadcn/ui-derived primitives used by components/pm
  lib/          # API client (api.ts), auth context, Supabase client, demo
                # fixture types/data still used by a couple of screens
docs/
  BACKEND_REQUIREMENTS.md   # tracked gaps between this UI and gd-proto's
                             # API, referenced from route comments as "BE-N"
```

## Status

Actively being migrated off its original AI-scaffolded demo data onto
`gd-proto`'s real API — see `../ACTION_PLAN.md` (Phase 2) for the live
checklist. Known gaps are tracked in `docs/BACKEND_REQUIREMENTS.md` and
referenced inline in route comments (e.g. `BE-8`, `BE-16`).
