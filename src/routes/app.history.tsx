/**
 * Renders the mobile "history" screen: summary stat cards, a score-trend
 * chart, and a list of past sessions grouped by month — all fetched from
 * the real backend.
 *
 * - NativeHistory(): main route component; renders the stats, chart, and
 *   session history list.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Filter } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { Banner, EmptyState, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { ProgressChart, SessionRow, StatCard } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { getMyHistory, type HistorySession } from "@/lib/api";
import { average, computeStreak } from "@/lib/session/stats";
import { dateFormatterWithYear, monthFormatter } from "@/lib/session/formatting";
import { buildScoreTrend, realSessionsOnly, toSessionRow } from "@/lib/session/history";

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [
      { title: "History · PlaceMe Mobile" },
      { name: "description", content: "Your past group discussions and AI scores on mobile." },
      { property: "og:title", content: "History · PlaceMe Mobile" },
      { property: "og:description", content: "Track your GD progress week over week." },
    ],
  }),
  component: () => (
    <ProtectedRoute redirectTo="/app/login" consentRedirectTo="/app/consent">
      <NativeHistory />
    </ProtectedRoute>
  ),
});

// Main route component: renders real stat cards, a real score-trend chart,
// and past sessions grouped by month.
function NativeHistory() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thisMonthOnly, setThisMonthOnly] = useState(false);

  function fetchHistory() {
    setError(null);
    return getMyHistory(session)
      .then((r) => setSessions(r.sessions))
      .catch((e: Error) => setError(e.message));
  }
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchHistory is stable per session; re-created each render but only ever called here or from the retry button.
  }, [session]);

  // SCRUM-27: only ever show rooms that actually ran -- see the identical
  // comment in routes/history.tsx (the web equivalent of this screen).
  const realSessions = useMemo(() => (sessions ? realSessionsOnly(sessions) : null), [sessions]);

  const filtered = useMemo(() => {
    if (!realSessions) return [];
    if (!thisMonthOnly) return realSessions;
    const now = new Date();
    return realSessions.filter((s) => {
      const d = new Date(s.startedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [realSessions, thisMonthOnly]);

  const groups = useMemo(() => {
    const byMonth = new Map<string, HistorySession[]>();
    for (const s of filtered) {
      const key = monthFormatter.format(new Date(s.startedAt));
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(s);
    }
    return Array.from(byMonth.entries());
  }, [filtered]);

  const mostPracticed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of realSessions ?? []) {
      if (!s.topicText) continue;
      counts.set(s.topicText, (counts.get(s.topicText) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [realSessions]);

  const scoreTrend = useMemo(() => buildScoreTrend(realSessions ?? []), [realSessions]);
  const avgScore = useMemo(
    () => average((realSessions ?? []).flatMap((s) => (s.score != null ? [s.score] : []))),
    [realSessions],
  );
  const avgTalkShare = useMemo(
    () => average((realSessions ?? []).flatMap((s) => (s.talkShare != null ? [s.talkShare] : []))),
    [realSessions],
  );
  const streak = useMemo(() => computeStreak(realSessions ?? []), [realSessions]);

  return (
    <NativeTabScreen
      title="History"
      right={
        <PmButton
          variant={thisMonthOnly ? "primary" : "outline"}
          size="sm"
          onClick={() => setThisMonthOnly((v) => !v)}
        >
          <Filter className="size-4" />
        </PmButton>
      }
    >
      <div className="space-y-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Sessions" value={realSessions ? String(realSessions.length) : "…"} />
          <StatCard label="Avg. score" value={avgScore != null ? String(avgScore) : "—"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Speak time" value={avgTalkShare != null ? `${avgTalkShare}%` : "—"} />
          <StatCard
            label="Streak"
            value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "—"}
          />
        </div>
        {error && (
          <Banner
            tone="danger"
            title="Couldn't load your history"
            description={error}
            action={
              <PmButton variant="outline" size="sm" onClick={() => fetchHistory()}>
                Try again
              </PmButton>
            }
          />
        )}
        <PmCard className="p-4">
          <SectionTitle title="Score trend" subtitle="Your last scored sessions" />
          {scoreTrend.length > 0 ? (
            <ProgressChart series={scoreTrend} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No scored sessions yet.
            </p>
          )}
        </PmCard>
        <PmCard className="p-4">
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
        {groups.map(([month, monthSessions]) => (
          <div key={month}>
            <SectionTitle
              title={month}
              subtitle={`${monthSessions.length} session${monthSessions.length === 1 ? "" : "s"}`}
            />
            <div className="space-y-3">
              {monthSessions.map((s) => (
                <SessionRow
                  key={s.id}
                  s={toSessionRow(s, dateFormatterWithYear)}
                  to="/app/ended"
                  search={{ roomId: s.id }}
                />
              ))}
            </div>
          </div>
        ))}
        {realSessions && filtered.length === 0 && (
          <EmptyState
            icon={<CalendarClock />}
            title="No sessions yet"
            description="Start a discussion to see it show up here."
            action={
              <PmButton asChild size="sm">
                <Link to="/app/match">Start a session</Link>
              </PmButton>
            }
          />
        )}
      </div>
    </NativeTabScreen>
  );
}
