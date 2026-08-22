/**
 * Renders the "Random match" page where a signed-in student can request to be
 * paired into a live group discussion, watches a searching/queued state while
 * waiting, and can cancel or retry if no match is found in time.
 *
 * - MatchPage(): main route component; manages match/queue state and renders
 *   the idle / searching / gave-up UI.
 * - stopWaiting(): clears the active queue-poll interval and give-up timeout.
 * - enterRoom(): stops waiting and navigates into the matched lobby room.
 * - startQueuePolling(): polls for an active room while queued, and gives up
 *   after MAX_QUEUE_WAIT_MS.
 * - handleMatch(): requests a match and either starts queue polling or enters
 *   a room immediately.
 * - handleCancel(): cancels the search, stopping timers and leaving the match
 *   queue.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw, Shuffle, Users, X } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  PmButton,
  PmCard,
  PmInput,
  PmSelect,
  Field,
  SectionTitle,
  Skel,
  StatusDot,
} from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { getActiveRoom, leaveMatchQueue, requestMatch } from "@/lib/api";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/match")({
  head: () => ({
    meta: [
      { title: "Random match · PlaceMe" },
      {
        name: "description",
        content: "Get paired with skill-matched peers for an instant live group discussion.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <MatchPage />
    </ProtectedRoute>
  ),
});

const DEFAULT_DURATION_SECONDS = 600;
const QUEUE_POLL_INTERVAL_MS = 4000;
const MAX_QUEUE_WAIT_MS = 90000;

type State = "idle" | "searching" | "gaveUp";

// Main route component: renders the idle / searching / gave-up states for
// requesting a random group-discussion match and handles polling for a room.
function MatchPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(600);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const giveUpRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Stops the active queue-poll interval and give-up timeout.
  const stopWaiting = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (giveUpRef.current) clearTimeout(giveUpRef.current);
  }, []);

  useEffect(() => {
    return () => {
      stopWaiting();
      leaveMatchQueue(sessionRef.current).catch(() => {});
    };
  }, [stopWaiting]);

  // Stops waiting and navigates the student into the matched lobby room.
  function enterRoom(room: { id: string; code: string }) {
    stopWaiting();
    track({ name: "room_joined", properties: { roomId: room.id, method: "match" } });
    navigate({
      to: "/lobby/$roomId",
      params: { roomId: room.id },
      search: { code: room.code, isCreator: false },
    });
  }

  // Polls for an active room while queued, entering it if one appears, and
  // gives up (moving to the "gaveUp" state) after MAX_QUEUE_WAIT_MS.
  function startQueuePolling() {
    pollRef.current = setInterval(async () => {
      try {
        const { room } = await getActiveRoom(sessionRef.current);
        if (room) enterRoom(room);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, QUEUE_POLL_INTERVAL_MS);

    giveUpRef.current = setTimeout(async () => {
      stopWaiting();
      setState("gaveUp");
      await leaveMatchQueue(sessionRef.current).catch(() => {});
    }, MAX_QUEUE_WAIT_MS);
  }

  // Requests a match; if the response says queued, starts queue polling,
  // otherwise enters the returned room immediately.
  async function handleMatch() {
    setState("searching");
    setError(null);
    try {
      const result = await requestMatch(session, { durationSeconds });
      if ("status" in result && result.status === "queued") {
        startQueuePolling();
      } else if ("id" in result) {
        enterRoom(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("idle");
    }
  }

  // Cancels the search: stops timers, resets to idle, and leaves the match queue.
  async function handleCancel() {
    stopWaiting();
    setState("idle");
    await leaveMatchQueue(session).catch(() => {});
  }

  return (
    <WebShell title="Random match">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PmCard glass className="p-8 text-center md:p-12">
          {state === "idle" && (
            <>
              <div className="mx-auto grid size-28 place-items-center rounded-full bg-primary/15">
                <span className="grid size-20 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">
                  <Shuffle className="size-8" />
                </span>
              </div>
              <h2 className="mt-7 text-2xl font-bold">Ready to find a group?</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                We'll pair you with whoever else is looking to practice right now.
              </p>
              {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}
              <PmButton size="lg" className="mt-8" onClick={handleMatch}>
                <Shuffle /> Find a match
              </PmButton>
            </>
          )}

          {state === "searching" && (
            <>
              <div className="mx-auto grid size-28 place-items-center rounded-full bg-primary/15">
                <span className="grid size-20 place-items-center rounded-full bg-[image:var(--gradient-primary)] pulse-ring text-primary-foreground">
                  <Shuffle className="size-8" />
                </span>
              </div>
              <h2 className="mt-7 text-2xl font-bold">Finding your group…</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                We'll take you straight into the room the moment enough students are matched in.
              </p>
              <StatusDot
                status="connecting"
                label="Waiting for enough students"
                className="mt-5 justify-center"
              />
              {/* MOCK — no live queue telemetry endpoint yet, see docs/BACKEND_REQUIREMENTS.md#BE-16.
                  Anonymous placeholders, not fixture people -- who's actually waiting isn't
                  known until the match resolves. */}
              <div className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <Skel className="size-14 rounded-full" />
                    <Skel className="h-3 w-10" />
                  </div>
                ))}
              </div>
              <PmButton variant="ghost" size="lg" className="mt-9" onClick={handleCancel}>
                <X data-icon="inline-start" /> Cancel search
              </PmButton>
            </>
          )}

          {state === "gaveUp" && (
            <div className="space-y-6">
              <div className="mx-auto grid size-28 place-items-center rounded-full bg-secondary">
                <Users className="size-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Nobody else is free right now</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  A discussion needs a few students to get going, and there aren't enough online at
                  the moment. You've been taken out of the queue.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <PmButton asChild size="lg">
                  <Link to="/rooms/new">Start a room and share the code</Link>
                </PmButton>
                <PmButton variant="ghost" onClick={handleMatch}>
                  <RefreshCw /> Try matching again
                </PmButton>
              </div>
            </div>
          )}
        </PmCard>

        <aside className="space-y-4">
          {/* Group size isn't wired here -- POST /api/rooms/match has no
              group-size/topic-pool filter yet (BE-4/BE-5), so only the field
              that's actually sent (duration) is shown. */}
          <PmCard className="p-5">
            <SectionTitle title="Match preferences" />
            <div className="space-y-4">
              <Field label="Duration (min)">
                <PmInput
                  type="number"
                  min="1"
                  max="25"
                  value={String(Math.floor(durationSeconds / 60))}
                  onChange={(e) => setDurationSeconds(Number(e.target.value) * 60)}
                />
              </Field>
            </div>
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}
