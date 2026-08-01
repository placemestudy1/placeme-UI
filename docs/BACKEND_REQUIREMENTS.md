# Backend requirements — gaps between place-me-UI and gd-proto

`place-me-UI` (this repo) is the designed product surface. `gd-proto/apps/server` is the
real backend it talks to. This doc lists everything the frontend already renders that the
backend cannot serve yet, so the mock data backing those parts of the UI can be replaced
once each item ships. It's a requirements list, not a spec — each item still needs a
proper spec/ADR/migration in `gd-proto` before implementation there (that repo's own
`CLAUDE.md` requires specs before behavior changes).

Every gap below is marked in the `place-me-UI` source with a comment pointing back here:

```ts
// MOCK — no backend support yet, see docs/BACKEND_REQUIREMENTS.md#BE-6 #BE-7
```

Nothing listed here has been deleted from the frontend — the UI keeps rendering it from
`src/lib/demo.ts` fixtures until the backend catches up.

## Priority key

- **P0** — blocks a core flow from being fully real (matchmaking, room creation)
- **P1** — a whole screen/section reads as fake without it (feedback score, history stats)
- **P2** — nice-to-have polish, no core flow depends on it

---

### BE-1 — Room discovery / browsable open rooms (P0) — code complete, not yet live

**Where**: `/join`'s room grid, `/` home's "rooms open now". (`/match`'s aside was never
actually implemented against this item — see below.)
**Status (2026-08-01)**: implemented on `gd-proto` branch `feat/be-1-room-discovery`
(`SPEC-0004`) — `GET /api/rooms/open` returns `status: 'waiting'` + `visibility: 'public'`
rooms, newest first, bounded, excluding any room already at its own capacity. `/join`'s
room grid and `/`'s "Rooms open now" are wired to it; clicking a real room card prefills
the join-code field (`/join`) or navigates to `/join` (`/`) rather than auto-joining.
**No schema change was needed** — unlike BE-2/BE-3, both `visibility` and
`max_participants` already existed, so this is a pure code addition with nothing blocking
`main` promotion. **Not yet merged to `dev`/`main`.** Remove this entry once merged.
**`level` is still fake** ("Any level" placeholder, not a real value — see BE-4) since that
item isn't built. **`/match`'s aside was intentionally left alone** — it shows live queue
telemetry (BE-16, a different unbuilt item), not a room listing; wiring it was never part
of this pass. Update this doc's own "Where" line above if that was a documentation error to
begin with, not something this session should decide unilaterally.
**Why it was blocked**: `gd-proto` had no room-listing endpoint. A room was only reachable
by exact code (`POST /api/rooms/join`), by being matched into it, or by being its own
creator. There was no concept of a publicly browsable, joinable room.

### BE-2 — Configurable room capacity (P0) — code complete, not yet live

**Where**: `/rooms/new`'s "Seats" select (4/6/8/10).
**Status (2026-08-01)**: implemented on `gd-proto` branch `feat/be-2-room-capacity`
(`SPEC-0002`) — `POST /api/rooms` now accepts an optional `maxParticipants` (3–12,
`domain/roomCapacity.js`'s `isValidMaxParticipants`), defaults to the previous constant
when omitted, and the join-capacity check reads each room's own stored value instead of
the global default. `place-me-UI`'s Seats select is wired to state and sends it. **Not yet
merged to `dev`/`main`, and migration `0014_rooms_max_participants.sql` is not yet applied
to the live Supabase project** — until both land, this still behaves as before in any
deployed environment. Remove this entry once merged and confirmed live.
**Why it was blocked**: `POST /api/rooms` didn't accept a capacity parameter — the server
enforced a fixed constant (`DEFAULT_MAX_ROOM_PARTICIPANTS` in `domain/roomCapacity.js`)
for every room.

### BE-3 — Room visibility (public/private) (P0) — code complete, not yet live

**Where**: `/rooms/new`'s Public/Private radio group.
**Status (2026-08-01)**: implemented on `gd-proto` branch `feat/be-3-room-visibility`
(`SPEC-0003`) — `POST /api/rooms` now accepts an optional `visibility`
(`'public' | 'private'`, `domain/roomVisibility.js`'s `isValidVisibility`), defaults to
`'private'` when omitted, and matched rooms (`POST /api/rooms/match`) always get the
DB-level default rather than a creator choice. `place-me-UI`'s radio group is wired to
state and sends it. **Not yet merged to `dev`/`main`, and migration
`0015_rooms_visibility.sql` is not yet applied to the live Supabase project** — until both
land, this still behaves as before in any deployed environment. Remove this entry once
merged and confirmed live.
**Why it was blocked**: no `visibility` concept existed on the `rooms` table; every room
behaved like "private" (code/match only).
**Correction (2026-08-01)**: this item's header previously read "depends on BE-1", which
contradicted its own suggested shape ("a `visibility` column... read by BE-1's listing
endpoint"). It's the reverse — **BE-1 depends on this column existing**, not the other way
around. Fixed to match the agreed implementation order (BE-2 → BE-3 → BE-1).

### BE-4 — Room/match level (difficulty) (P1) — split, room-creation half done, not yet live

**Where**: `/rooms/new`'s Level select (done), `/match`'s "Level" preference (still open).
**Status (2026-08-01)**: split into two halves per direct user instruction, since they
differ hugely in risk. **Room-creation half implemented** on `gd-proto` branch
`feat/be-4-room-level` (`SPEC-0005`) — `POST /api/rooms` accepts an optional `level`
(`'beginner' | 'intermediate' | 'advanced'`), defaults to `'intermediate'`,
`/rooms/new`'s Level select is wired to it. **Match-side level filtering is deliberately
deferred** — `POST /api/rooms/match` still never accepts or uses a `level` at all, and
`/match`'s Level preference remains fully mocked. That half needs a schema change to
`matchmaking_queue` (currently stores only `user_id`) and a change to
`domain/matchmaking.js`'s `matchmake()` — the pure, tested, race-sensitive core of the
whole matching system — which is a materially bigger change than a single-table
creation-time field. Deferred to be folded in alongside **BE-5** rather than done twice,
since BE-5 already touches the same `/api/rooms/match` request body (group size, topic
pool). **Not yet merged to `dev`/`main`, migration `0016` not yet applied live.**
**Why it was blocked**: no `level` field existed anywhere on rooms, topics, or the
matchmaking request body (`POST /api/rooms/match` only accepted `durationSeconds`).
**Suggested shape, still open for the match-filtering half**: an optional `level` filter
param on `/api/rooms/match` that only matches same-level members (`domain/matchmaking.js`).

### BE-5 — Match preferences: group size, topic pool, level (P1, depends on BE-4's match-filtering half)

**Where**: `/match`'s "Group size", "Topic pool", and "Level" selects.
**Why it's blocked**: `domain/matchmaking.js`'s min/max group size is a fixed server
default (`DEFAULT_MIN_GROUP_SIZE`/`DEFAULT_MAX_GROUP_SIZE` in `api/routes/rooms.js`), not
caller-supplied, and there's no topic-category or level filter on matching.
**Suggested shape**: optional `groupSize`/`topicCategory`/`level` params on
`POST /api/rooms/match`, same validation pattern as `durationSeconds`. The `level` filter
is BE-4's still-deferred match-filtering half (2026-08-01 decision to fold it in here
rather than build it twice) — needs a `matchmaking_queue` schema change (currently only
stores `user_id`) and a change to `domain/matchmaking.js`'s `matchmake()` itself.

### BE-6 — Numeric overall score (P1) — done, not yet live

**Where**: `/ended`'s `ScoreRing`, `/history`'s score badges.
**Status (2026-08-01)**: resolved. `gd-proto`'s `domain/feedbackPrompt.js` now requests
Gemini's structured-output mode (`generationConfig.responseSchema`) for a 0–100 overall
score alongside the rubric/strengths/improvements (`SPEC-0006`, PR #77); `feedback.score
integer` (0–100 check constraint) is migration `0017`. `GET /api/rooms/:id/feedback/mine`
and `GET /api/history/mine` both return `score` additively. `src/lib/api.ts`'s
`getMyFeedback` and `ended.$roomId.tsx` are wired to the real value — `ScoreRing` renders
it when present, and a "Score not available" placeholder (never a fabricated 0) when
`score` is `null` (a pre-migration row, or the transcription-failed case). `/history`'s
badge was wired separately as BE-19.
**Not live yet** — depends on `gd-proto` migration `0017` being applied to the live
Supabase project (tracked in `gd-proto/docs/engineering/PLAN.md` §3, not here).

### BE-7 — Per-dimension rubric (P1, same change as BE-6) — done, not yet live

**Where**: `/ended`'s "Score breakdown" bars (Content depth / Clarity / Confidence /
Listening / Fluency) and the "What worked"/"Fix next time" `FeedbackList`s.
**Status (2026-08-01)**: resolved, same change as BE-6. `feedback.dimensions jsonb`
(`[{label, score, note}]`, migration `0017`) is a fixed 5-entry array in this exact order,
enforced by the prompt's `responseSchema` and validated defensively in
`parseFeedbackResponse` (exact count/label/order, 0–100 bounds). `strengths`/
`improvements jsonb` (also `0017`) replace the old `feedbackStrengths`/
`feedbackImprovements` mock arrays in `ended.$roomId.tsx` — the score-breakdown card and
both feedback lists only render when real data exists (empty for a pre-migration row or
the transcription-failed stub, never a placeholder list of nothing).
**Not live yet** — same migration `0017` dependency as BE-6.

### BE-8 — Score trend over time (P1, depends on BE-6)

**Where**: `/history`'s and `/`'s score trend chart (`ProgressChart`/`progressSeries`).
**Why it's blocked**: no numeric score exists yet at all (BE-6), so there's nothing to
trend.
**Suggested shape**: once BE-6 ships, a simple aggregation either client-side (this app
already fetches full history via `GET /api/history/mine`, could compute the trend from
that response directly) or, if history grows large, a dedicated
`GET /api/history/mine/trend` endpoint.

### BE-9 — Aggregate stats: streak, avg score, speak-time % (P1)

**Where**: `/` home and `/history` stat tiles.
**Why it's blocked**: "avg score" depends on BE-6. "Speak-time %" depends on BE-10.
"Streak" (consecutive days practiced) has no computation anywhere — `GET /api/history/mine`
returns raw session rows only, no derived stats.
**Suggested shape**: once BE-6/BE-10 exist, either compute streak/avg/speak-time
client-side from the full history response, or add a `GET /api/me/stats` endpoint if the
history list is ever paginated (which would make client-side aggregation incomplete).

### BE-10 — Per-participant talk-time share (P1)

**Where**: every `ParticipantTile`'s `talkShare` %, `/ended`'s "Talk-time split" bars,
`/session`'s "Your speak time" card.
**Why it's blocked**: `transcript_lines` rows have a `started_at_ms` per line but no
computed "share of total session time" anywhere. `GET /api/rooms/:id/transcript` returns
raw lines only.
**Suggested shape**: a derived field, either computed client-side from transcript line
timestamps + the room's known duration, or precomputed server-side and added to the
`/transcript` or `/participants` response. Live (mid-session) speak-time (BE-17) is a
separate, harder real-time version of this same computation.

### BE-11 — Transcript line tagging (P2)

**Where**: `TranscriptLineItem`'s "Strong point" / "Interruption" / "Filler words" tags on
`/session` and `/ended`.
**Why it's blocked**: no analysis pass exists on transcript lines beyond attribution
(`domain/attribution.js`) — they're stored as plain `{userId, text, startedAtMs}`.
**Suggested shape**: a post-hoc tagging step (could piggyback on the existing feedback
generation Gemini call — ask it to also return per-line tags for the target student's own
lines) or, more ambitiously, a live tagging pass during transcription. Lower priority than
BE-6/BE-7 since it's decoration on top of the transcript, not a headline feature.

### BE-12 — OAuth login (Google/Apple) (P2, infra not code)

**Where**: `/login`'s "Continue with Google" button, `/app/login`'s "Continue with Apple".
**Why it's blocked**: Supabase supports OAuth providers natively, but none are configured
on this project. `place-me-UI` wires the real `supabase.auth.signInWithOAuth()` call
regardless — it'll 400 until a provider is enabled.
**Suggested shape**: enable Google (and optionally Apple) under Supabase dashboard →
Authentication → Providers, with the OAuth app credentials and redirect URL for both the
local dev and deployed frontend origins. No `gd-proto` server code changes needed.

### BE-13 — Forgot-password flow (P2, low effort)

**Where**: not currently in the mock UI at all (neither frontend has a reset-password
screen), but a real product needs one.
**Why it's blocked**: nothing wired yet anywhere. Supabase's `resetPasswordForEmail` +
`updateUser({ password })` cover this natively.
**Suggested shape**: a `/forgot-password` page (email → `resetPasswordForEmail`) and a
`/reset-password` page (new password → `updateUser`), with the redirect URL allowlisted
in Supabase auth settings. No new `gd-proto` endpoints needed.

### BE-14 — Extra signup profile fields: college, graduating year (P1)

**Where**: `/signup`'s "College" and "Graduating year" fields.
**Why it's blocked**: `profiles` table (`supabase/migrations/0001_profiles.sql`) only has
`id` and `display_name`. The signup trigger (`handle_new_user`) only reads
`raw_user_meta_data->>'display_name'`.
**Suggested shape**: a new migration adding `college text` and `graduation_year int`
columns to `profiles`, and updating `handle_new_user` to also read
`raw_user_meta_data->>'college'` / `->>'graduation_year'`. Frontend already collects both
at signup — this is purely a schema + trigger change once approved.

### BE-15 — Room "context"/moderator instructions field (P2)

**Where**: `/rooms/new`'s "Context for participants" textarea.
**Why it's blocked**: no such column on `rooms` or `topics` — the feedback prompt
(`domain/feedbackPrompt.js`) only ever receives the topic text, not free-form room
instructions.
**Suggested shape**: an optional `context text` column on `rooms`, surfaced in the lobby
and (if useful) folded into the feedback prompt as additional untrusted context (same
delimiting treatment the prompt already gives custom topic text).

### BE-16 — Live queue/room telemetry (P2)

**Where**: `/match`'s "23 online", "avg wait 24s", "4 of 6 seats filled" copy.
**Why it's blocked**: no endpoint exposes matchmaking queue depth or online-user counts.
**Suggested shape**: a lightweight `GET /api/rooms/match/stats` (queue length, rolling
average wait) — genuinely optional polish, not needed for matching to function correctly.

### BE-17 — Live (mid-session) speak-time (P2, harder version of BE-10)

**Where**: `/session`'s "Your speak time" card, updating in real time during a live
discussion.
**Why it's blocked**: BE-10 only covers post-session computation; a live version needs a
running tally pushed to the client while the room is still active — likely over the
existing LiveKit data-channel captions mechanism (`agent/roomAgent.js` already broadcasts
per-turn transcript data; a running per-speaker duration could ride the same channel).

### BE-18 — Participant count on history rows (P2, small)

**Where**: `/history`'s and `/`'s `SessionRow` "· N participants" segment.
**Why it's blocked**: `GET /api/history/mine` (`domain/sessionHistory.js`'s
`buildSessionHistory`) returns topic/status/duration/feedback per room but not a
participant count — fetching it per row today would mean one `/api/rooms/:id/participants`
call per history row, which doesn't scale. The frontend currently just omits this segment
for real rows rather than doing that.
**Suggested shape**: have `buildSessionHistory` join a participant count per room (a single
grouped query) and include it in the response.

### BE-19 — "Analyzed" sessions with no numeric score (P1) — done, not yet live

**Where**: `/history`'s and `/`'s `SessionRow` score badge.
**Status (2026-08-01)**: resolved. Note this did *not* actually resolve "automatically"
as this entry originally predicted — `GET /api/history/mine` returning a real `score` (via
BE-6/BE-7) wasn't enough by itself; `src/lib/api.ts`'s `HistorySession` type and both
`toSessionRow` mappers (`history.tsx`, `index.tsx`) still needed the field wired through
explicitly. `SessionRow` (`components/pm/blocks.tsx`) already had the right rendering logic
built in ahead of time (`s.score != null ? <PmBadge>{s.score}</PmBadge> : ...Analyzed`), so
no component change was needed there. **"Analyzed" is now only a genuine fallback**
(feedback exists but no score — e.g. a pre-migration row), not the everyday case. **Not
live yet** — depends on BE-6/BE-7's `gd-proto` migration `0017` being applied to the live
Supabase project (tracked there, not here).
**Why it was blocked**: same as BE-6 — no numeric score existed. The frontend showed a
plain "Analyzed" badge instead of a number for real rows, which was honest but not what the
mock originally showed (a number).

### BE-20 — Raise-hand signal (P2)

**Where**: `/session`'s "Raise hand" pill button (currently a no-op).
**Why it's blocked**: no LiveKit data-channel message type for this exists (only the
`transcript` topic used for captions, per `agent/roomAgent.js`/`LiveRoomAudio.jsx`).
**Suggested shape**: a new data-channel message type (e.g. `{type: 'hand_raised',
identity, raised: boolean}`) published directly student-to-room (would need
`canPublishData` reconsidered for student tokens, currently deliberately `false` — see
`M1` comment in `api/routes/rooms.js` — so this needs a scoped exception, not a blanket
grant).

---

## Explicitly NOT a backend gap (frontend-only, no `gd-proto` change needed)

- **Copy invite link** — clipboard API only.
- **Audio device settings dialog** (`/lobby`'s Input/Output/Noise-suppression) —
  `navigator.mediaDevices.enumerateDevices()`, entirely client-side.
- **"Most practiced topic" tally** on `/history` — derivable client-side from the topic
  text already returned by `GET /api/history/mine`.
- **"This month" history filter** — client-side filter over already-fetched data.
- **Share report** (`/ended`) — clipboard copy of a client-composed summary string.
