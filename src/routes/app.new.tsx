/**
 * Renders the mobile "create new room" screen: pick a topic, seats,
 * duration and visibility, then create the room via the real API and
 * navigate into its lobby.
 *
 * - NativeNewRoom(): main route component; renders the new-room
 *   configuration UI and submits it to create the room.
 * - onSubmit(): resolves the chosen topic (AI-generated or custom), creates
 *   the room via the API, and navigates to the room's lobby on success.
 */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Loader2 } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { Field, PmBadge, PmButton, PmCard, PmSelect } from "@/components/pm/kit";
import { topics } from "@/lib/demo";
import { useAuth } from "@/lib/auth-context";
import { createRoom, generateTopic, submitCustomTopic } from "@/lib/api";

export const Route = createFileRoute("/app/new")({
  head: () => ({
    meta: [
      { title: "New room · PlaceMe Mobile" },
      {
        name: "description",
        content: "Create a group discussion room from the PlaceMe mobile app.",
      },
      { property: "og:title", content: "New room · PlaceMe Mobile" },
      { property: "og:description", content: "Pick a topic, set the timer, share the code." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login">
      <NativeNewRoom />
    </ProtectedRoute>
  ),
});

const AI_TOPIC_VALUE = "__ai__";

// Main route component: renders the new-room configuration form and wires
// it up to real room creation.
function NativeNewRoom() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [topicChoice, setTopicChoice] = useState<string>(topics[0]);
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [durationSeconds, setDurationSeconds] = useState(1200);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolves the selected topic (AI-generated or custom), creates the room
  // via the API, and navigates to the room's lobby on success.
  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const topic =
        topicChoice === AI_TOPIC_VALUE
          ? await generateTopic(session)
          : await submitCustomTopic(session, { text: topicChoice });
      const room = await createRoom(session, {
        topicId: topic.id,
        durationSeconds,
        maxParticipants,
        visibility,
        level,
      });
      navigate({
        to: "/app/lobby",
        search: { roomId: room.id, code: room.code, topicText: topic.text, isCreator: true },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <NativeTabScreen title="New room">
      <form className="space-y-5 pb-4" onSubmit={onSubmit}>
        <PmCard className="space-y-4 p-4">
          <Field label="Topic">
            <PmSelect value={topicChoice} onChange={(e) => setTopicChoice(e.target.value)}>
              <option value={AI_TOPIC_VALUE}>✨ Let AI suggest one</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </PmSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seats">
              <PmSelect
                value={String(maxParticipants)}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              >
                <option value="4">4</option>
                <option value="6">6</option>
                <option value="8">8</option>
                <option value="10">10</option>
              </PmSelect>
            </Field>
            <Field label="Duration">
              <PmSelect
                value={String(durationSeconds)}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
              >
                <option value="900">15 min</option>
                <option value="1200">20 min</option>
                <option value="1500">25 min</option>
              </PmSelect>
            </Field>
          </div>
          <Field label="Level">
            <PmSelect
              value={level}
              onChange={(e) => setLevel(e.target.value as "beginner" | "intermediate" | "advanced")}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </PmSelect>
          </Field>
          <Field label="Visibility">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`rounded-lg py-2 text-xs font-semibold ${visibility === "public" ? "bg-card text-foreground" : "text-muted-foreground"}`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`rounded-lg py-2 text-xs font-semibold ${visibility === "private" ? "bg-card text-foreground" : "text-muted-foreground"}`}
              >
                Private
              </button>
            </div>
          </Field>
        </PmCard>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        {/* Illustrative only — the real room code is only assigned once the
            room is actually created (POST /api/rooms). */}
        <PmCard glass className="p-4 text-center">
          <PmBadge tone="primary">Room code</PmBadge>
          <p className="mt-2 font-mono text-2xl font-bold tracking-[0.2em] text-muted-foreground">
            {busy ? <Loader2 className="mx-auto size-6 animate-spin" /> : "— — — —"}
          </p>
          <PmButton variant="outline" size="sm" className="mt-3" disabled>
            <Copy /> Share invite
          </PmButton>
        </PmCard>

        <PmButton type="submit" block size="lg" loading={busy} disabled={busy}>
          {busy ? "Creating…" : "Create room"}
        </PmButton>
      </form>
    </NativeTabScreen>
  );
}
