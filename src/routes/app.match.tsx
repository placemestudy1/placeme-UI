/**
 * Renders the PlaceMe mobile app's random-match screen: requests a real
 * match, shows a searching/queued state while waiting, and navigates into
 * the matched room's lobby — or lets the student cancel or retry.
 *
 * - NativeMatch(): main route component; manages match/queue state and
 *   renders the idle/searching/gave-up UI.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RefreshCw, Shuffle, Users } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  PmAvatar,
  PmButton,
  PmCard,
  PmInput,
  Field,
  Skel,
  StatusDot,
  SectionTitle,
} from "@/components/pm/kit";
import { participants } from "@/lib/demo";
import { useAuth } from "@/lib/auth-context";
import { getActiveRoom, leaveMatchQueue, requestMatch } from "@/lib/api";

export const Route = createFileRoute("/app/match")({
  head: () => ({
    meta: [
      { title: "Random match · PlaceMe Mobile" },
      { name: "description", content: "Get matched into a live group discussion from your phone." },
      { property: "og:title", content: "Random match · PlaceMe Mobile" },
      { property: "og:description", content: "Skill-matched peers in under 30 seconds." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login">
      <NativeMatch />
    </ProtectedRoute>
  ),
});

const DEFAULT_DURATION_SECONDS = 600;
const QUEUE_POLL_INTERVAL_MS = 4000;
const MAX_QUEUE_WAIT_MS = 90000;

type State = "idle" | "searching" | "gaveUp";

// Main route component: requests a real match and renders the idle /
// searching / gave-up states, same state machine as the real web /match.
function NativeMatch() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(600);
  const [groupSize, setGroupSize] = useState(5);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const giveUpRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

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

  function enterRoom(room: { id: string; code: string }) {
    stopWaiting();
    navigate({ to: "/app/lobby", search: { roomId: room.id, code: room.code } });
  }

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

  async function handleCancel() {
    stopWaiting();
    setState("idle");
    await leaveMatchQueue(session).catch(() => {});
  }

  return (
    <NativeTabScreen title="Random match">
      <div className="space-y-4 pb-4">
        {state !== "gaveUp" && (
          <PmCard glass className="p-5 text-center">
            {state === "idle" ? (
              <>
                <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/15">
                  <span className="grid size-14 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">
                    <Shuffle className="size-6" />
                  </span>
                </div>
                <p className="mt-4 text-lg font-bold">Ready to find a group?</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  We'll pair you with whoever else is looking to practice right now.
                </p>
                {error && <p className="mt-2 text-sm font-medium text-destructive">{error}</p>}
                <PmButton block size="lg" className="mt-5" onClick={handleMatch}>
                  <Shuffle /> Find a match
                </PmButton>
              </>
            ) : (
              <>
                <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/15">
                  <span className="pulse-ring grid size-14 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">
                    <Shuffle className="size-6" />
                  </span>
                </div>
                <p className="mt-4 text-lg font-bold">Finding your group…</p>
                <StatusDot
                  status="connecting"
                  label="Waiting for enough students"
                  className="mt-2 justify-center"
                />
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {participants.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex flex-col items-center gap-1.5">
                      <PmAvatar initials={p.initials} size="md" />
                      <span className="text-[10px] text-muted-foreground">
                        {p.name.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                  {[0, 1].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <Skel className="size-11 rounded-full" />
                      <Skel className="h-2.5 w-8" />
                    </div>
                  ))}
                </div>
                <PmButton variant="ghost" block className="mt-5" onClick={handleCancel}>
                  Cancel search
                </PmButton>
              </>
            )}
          </PmCard>
        )}

        {state === "gaveUp" && (
          <PmCard className="p-5 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-base font-bold">Nobody else is free right now</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You've been taken out of the queue. Try again in a bit.
            </p>
            <PmButton block className="mt-4" onClick={handleMatch}>
              <RefreshCw /> Try again
            </PmButton>
          </PmCard>
        )}

        <PmCard className="p-5">
          <SectionTitle title="Match preferences" />
          <div className="mt-3 space-y-3">
            <Field label="Group size">
              <PmInput
                type="number"
                min="2"
                max="5"
                value={String(groupSize)}
                onChange={(e) => setGroupSize(Number(e.target.value))}
              />
            </Field>
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
      </div>
    </NativeTabScreen>
  );
}
