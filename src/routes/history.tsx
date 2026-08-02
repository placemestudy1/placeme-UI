import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Filter } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { EmptyState, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { ProgressChart, SessionRow, StatCard, type ProgressPoint } from "@/components/pm/blocks";
import { type Session } from "@/lib/demo";
import { useAuth } from "@/lib/auth-context";
import { getMyHistory, type HistorySession } from "@/lib/api";

// BE-9: no `delta` text (the mock's "+4 this week" etc.) -- that's a
// period-over-period comparison this item doesn't ask for; StatCard's
// delta prop is optional, so real tiles simply omit it.
function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

// "Current streak" = consecutive calendar days with at least one ended
// session, still counted as active through the end of the day after the
// most recent practiced day (standard habit-tracker semantics) -- doesn't
// reset to 0 just because today hasn't happened yet.
function computeStreak(sessions: HistorySession[]): number {
  const practicedDays = new Set(
    sessions
      .filter((s) => s.status === "ended" && s.startedAt)
      .map((s) => new Date(s.startedAt as string).toDateString()),
  );
  function streakFrom(start: Date): number {
    let count = 0;
    const cursor = new Date(start);
    while (practicedDays.has(cursor.toDateString())) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }
  const today = new Date();
  const fromToday = streakFrom(today);
  if (fromToday > 0) return fromToday;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return streakFrom(yesterday);
}

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History · PlaceMe" },
      {
        name: "description",
        content: "Every past group discussion with scores, durations and AI feedback.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <HistoryPage />
    </ProtectedRoute>
  ),
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const monthFormatter = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const trendLabelFormatter = new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" });

// BE-8: real trend from actually-scored sessions, chronological, capped so
// the chart stays readable rather than trying to bucket by week -- at
// pilot scale a student may have very few sessions, and fake weekly gaps
// would be more misleading than a plain "last N scored sessions" line.
const MAX_TREND_POINTS = 8;

function buildScoreTrend(sessions: HistorySession[]): ProgressPoint[] {
  return sessions
    .filter(
      (s): s is HistorySession & { score: number; startedAt: string } =>
        s.score != null && s.startedAt != null,
    )
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .slice(-MAX_TREND_POINTS)
    .map((s) => ({ label: trendLabelFormatter.format(new Date(s.startedAt)), score: s.score }));
}

function toSessionRow(s: HistorySession): Session {
  return {
    id: s.id,
    topic: s.topicText ?? "Untitled discussion",
    date: s.startedAt ? dateFormatter.format(new Date(s.startedAt)) : "Not started yet",
    duration: `${Math.round(s.durationSeconds / 60)} min`,
    code: s.code,
    // BE-19: real score once BE-6/BE-7 has produced one -- "Analyzed" is
    // now only a genuine fallback (feedback generated, score not, e.g. a
    // pre-migration row), not the everyday case.
    score: s.score ?? undefined,
    status: s.status === "ended" && s.feedback ? "Analyzed" : "Processing",
  };
}

function HistoryPage() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thisMonthOnly, setThisMonthOnly] = useState(false);

  useEffect(() => {
    getMyHistory(session)
      .then((r) => setSessions(r.sessions))
      .catch((e: Error) => setError(e.message));
  }, [session]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (!thisMonthOnly) return sessions;
    const now = new Date();
    return sessions.filter((s) => {
      if (!s.startedAt) return false;
      const d = new Date(s.startedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [sessions, thisMonthOnly]);

  const groups = useMemo(() => {
    const byMonth = new Map<string, HistorySession[]>();
    for (const s of filtered) {
      const key = s.startedAt ? monthFormatter.format(new Date(s.startedAt)) : "Not started yet";
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(s);
    }
    return Array.from(byMonth.entries());
  }, [filtered]);

  const mostPracticed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions ?? []) {
      if (!s.topicText) continue;
      counts.set(s.topicText, (counts.get(s.topicText) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [sessions]);

  const scoreTrend = useMemo(() => buildScoreTrend(sessions ?? []), [sessions]);

  const avgScore = useMemo(
    () => average((sessions ?? []).flatMap((s) => (s.score != null ? [s.score] : []))),
    [sessions],
  );
  const avgTalkShare = useMemo(
    () => average((sessions ?? []).flatMap((s) => (s.talkShare != null ? [s.talkShare] : []))),
    [sessions],
  );
  const streak = useMemo(() => computeStreak(sessions ?? []), [sessions]);

  const totalMinutes = (sessions ?? []).reduce(
    (sum, s) => sum + Math.round(s.durationSeconds / 60),
    0,
  );

  return (
    <WebShell
      title="History"
      subtitle={
        sessions
          ? `${sessions.length} sessions · ${totalMinutes}m of speaking practice`
          : "Loading…"
      }
      actions={
        <PmButton
          variant={thisMonthOnly ? "primary" : "outline"}
          onClick={() => setThisMonthOnly((v) => !v)}
        >
          <Filter /> This month
        </PmButton>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Sessions" value={sessions ? String(sessions.length) : "…"} />
            <StatCard label="Avg. score" value={avgScore != null ? String(avgScore) : "—"} />
            <StatCard label="Speak time" value={avgTalkShare != null ? `${avgTalkShare}%` : "—"} />
            <StatCard
              label="Streak"
              value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "—"}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          {groups.map(([month, monthSessions]) => (
            <div key={month}>
              <SectionTitle
                title={month}
                subtitle={`${monthSessions.length} session${monthSessions.length === 1 ? "" : "s"}`}
              />
              <div className="space-y-3">
                {monthSessions.map((s) => (
                  <SessionRow key={s.id} s={toSessionRow(s)} to={`/ended/${s.id}`} />
                ))}
              </div>
            </div>
          ))}

          {sessions && filtered.length === 0 && (
            <EmptyState
              icon={<CalendarClock />}
              title="No sessions yet"
              description="Start a discussion to see it show up here."
              action={
                <PmButton asChild size="sm">
                  <Link to="/match">Start a session</Link>
                </PmButton>
              }
            />
          )}
        </div>
        <aside className="space-y-4">
          <PmCard className="p-5">
            <SectionTitle title="Score trend" subtitle="Your last scored sessions" />
            {scoreTrend.length > 0 ? (
              <ProgressChart series={scoreTrend} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No scored sessions yet.
              </p>
            )}
          </PmCard>
          <PmCard className="p-5">
            <SectionTitle title="Most practiced" />
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {mostPracticed.length === 0 && <li>Nothing yet</li>}
              {mostPracticed.map(([topic, count]) => (
                <li key={topic} className="flex justify-between gap-3">
                  <span className="truncate">{topic}</span>
                  <span className="shrink-0 text-foreground">{count}</span>
                </li>
              ))}
            </ul>
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}
