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
import { Copy, Loader2, Lock, Minus, Plus, Users } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { Field, PmBadge, PmButton, PmCard, PmSegmented, PmSelect } from "@/components/pm/kit";
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
    <ProtectedRoute redirectTo="/app/login" consentRedirectTo="/app/consent">
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
          <Field label="Max participants">
            <div className="flex items-center justify-between rounded-full border border-input px-4 py-1.5">
              <button
                type="button"
                aria-label="Fewer participants"
                onClick={() => setMaxParticipants((n) => Math.max(4, n - 2))}
                className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground"
              >
                <Minus className="size-4" />
              </button>
              <span className="text-sm font-bold">{maxParticipants} people</span>
              <button
                type="button"
                aria-label="More participants"
                onClick={() => setMaxParticipants((n) => Math.min(10, n + 2))}
                className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </Field>
          <Field label="Duration">
            <PmSegmented
              value={String(durationSeconds)}
              onChange={(v) => setDurationSeconds(Number(v))}
              options={[
                { value: "900", label: "15 min" },
                { value: "1200", label: "20 min" },
                { value: "1500", label: "25 min" },
              ]}
            />
          </Field>
          <Field label="Level">
            <PmSegmented
              value={level}
              onChange={(v) => setLevel(v)}
              options={[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ]}
            />
          </Field>
          <Field label="Visibility">
            <PmSegmented
              value={visibility}
              onChange={(v) => setVisibility(v)}
              options={[
                { value: "public", label: "Public", icon: <Users /> },
                { value: "private", label: "Private", icon: <Lock /> },
              ]}
            />
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
