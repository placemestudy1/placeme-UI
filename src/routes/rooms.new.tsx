/**
 * Renders the "Create a room" screen for hosting a new group discussion: lets
 * the host pick a topic (curated, custom, or AI-generated), configure seats,
 * duration, level and visibility, then creates the room via the API before
 * navigating to the room's lobby.
 *
 * - CreateRoomPage(): main route component; renders the room-creation form
 *   and a live preview panel, and submits the form to create the topic/room.
 * - onSubmit(): form submit handler defined inside CreateRoomPage; resolves
 *   the chosen topic (AI-generated or custom), creates the room via the API,
 *   and navigates to the lobby on success.
 */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Lock, Loader2, Users } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import {
  Field,
  PmBadge,
  PmButton,
  PmCard,
  PmInput,
  PmSelect,
  PmTextarea,
  SectionTitle,
} from "@/components/pm/kit";
import { topics } from "@/lib/demo";
import { useAuth } from "@/lib/auth-context";
import { createRoom, generateTopic, submitCustomTopic } from "@/lib/api";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/rooms/new")({
  head: () => ({
    meta: [
      { title: "Create a room · PlaceMe" },
      {
        name: "description",
        content: "Set the topic, seats and timer for your live group discussion room.",
      },
      { property: "og:title", content: "Create a GD room · PlaceMe" },
      {
        property: "og:description",
        content: "Host a voice group discussion and invite peers with a room code.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <CreateRoomPage />
    </ProtectedRoute>
  ),
});

const AI_TOPIC_VALUE = "__ai__";

// Main route component: renders the room-creation form (topic, context,
function CreateRoomPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [topicChoice, setTopicChoice] = useState<string>(topics[0]);
  const [durationSeconds, setDurationSeconds] = useState(900);
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolves the selected topic (AI-generated or custom), creates the room
  // via the API, and navigates to the room's lobby on success.
  async function onSubmit(e: React.FormEvent) {
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
      track({ name: "room_created", properties: { roomId: room.id, durationSeconds, visibility } });
      navigate({
        to: "/lobby/$roomId",
        params: { roomId: room.id },
        search: { code: room.code, topicText: topic.text, isCreator: true },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WebShell title="Create a room" subtitle="Your room code is generated instantly">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PmCard className="p-6 md:p-8">
          <form className="space-y-5" onSubmit={onSubmit}>
            <Field
              label="Discussion topic"
              hint="Pick a suggested topic, write your own, or let AI choose"
            >
              <PmSelect value={topicChoice} onChange={(e) => setTopicChoice(e.target.value)}>
                <option value={AI_TOPIC_VALUE}>✨ Let AI suggest one</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </PmSelect>
            </Field>
            {/*
              MOCK — no backend field for free-form room instructions yet, see
              docs/BACKEND_REQUIREMENTS.md#BE-15. Left in the form, not submitted.
            
            <Field label="Context for participants">
              <PmTextarea defaultValue="Panel-style GD. Moderator opens, each speaker gets 90 seconds, then free debate. Cite data where possible." />
            </Field>
            */}
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Seats">
                <PmInput
                  type="number"
                  min="2"
                  max="5"
                  value={String(maxParticipants)}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
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
              <Field label="Level">
                <PmSelect
                  value={level}
                  onChange={(e) =>
                    setLevel(e.target.value as "beginner" | "intermediate" | "advanced")
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </PmSelect>
              </Field>
            </div>
            <Field label="Visibility">
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                    visibility === "public" ? "border-primary/50 bg-primary/10" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="vis"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                    className="accent-[var(--primary)]"
                  />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Users className="size-4" /> Public
                    </span>
                    <span className="text-xs text-muted-foreground">Listed for matched peers</span>
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                    visibility === "private" ? "border-primary/50 bg-primary/10" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="vis"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                    className="accent-[var(--primary)]"
                  />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Lock className="size-4" /> Private
                    </span>
                    <span className="text-xs text-muted-foreground">Code only</span>
                  </span>
                </label>
              </div>
            </Field>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-3 pt-2">
              <PmButton type="submit" size="lg" loading={busy} disabled={busy}>
                {busy ? "Creating…" : "Create room"}
              </PmButton>
            </div>
          </form>
        </PmCard>

        <aside className="space-y-4">
          <PmCard glass className="p-5">
            <SectionTitle title="Room preview" />
            <PmBadge tone="primary">Waiting for you to create it</PmBadge>
            <p className="mt-3 text-base font-semibold leading-snug">
              {topicChoice === AI_TOPIC_VALUE ? "AI will pick your topic" : topicChoice}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Hosted by you · {Math.round(durationSeconds / 60)} min
            </p>
            {/* Illustrative only — the real room code is only assigned once
                the room is actually created (POST /api/rooms). */}
            <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Room code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-muted-foreground">
                {busy ? <Loader2 className="mx-auto size-6 animate-spin" /> : "— — — —"}
              </p>
              <PmButton variant="outline" size="sm" className="mt-3" disabled>
                <Copy /> Copy invite
              </PmButton>
            </div>
          </PmCard>
          <PmCard className="p-5 text-sm text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">Hosting tips</p>
            6–8 speakers keeps everyone above the 10% speak-time threshold the AI needs for reliable
            scoring.
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}
