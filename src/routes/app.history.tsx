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
import { EmptyState, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { ProgressChart, SessionRow, StatCard } from "@/components/pm/blocks";
import { useAuth } from "@/lib/auth-context";
import { getMyHistory, type HistorySession } from "@/lib/api";
import { average, computeStreak } from "@/lib/session/stats";
import { dateFormatterWithYear, monthFormatter } from "@/lib/session/formatting";
import { buildScoreTrend, toSessionRow } from "@/lib/session/history";

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
    <ProtectedRoute redirectTo="/app/login">
      <NativeHistory />
    </ProtectedRoute>
  ),
});

// Main route component: renders real stat cards, a real score-trend chart,
// and past sessions grouped by month.
function NativeHistory() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);
  const [thisMonthOnly, setThisMonthOnly] = useState(false);

  useEffect(() => {
    getMyHistory(session)
      .then((r) => setSessions(r.sessions))
      .catch(() => {});
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
          <StatCard label="Sessions" value={sessions ? String(sessions.length) : "…"} />
          <StatCard label="Avg. score" value={avgScore != null ? String(avgScore) : "—"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Speak time" value={avgTalkShare != null ? `${avgTalkShare}%` : "—"} />
          <StatCard
            label="Streak"
            value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "—"}
          />
        </div>
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
        {sessions && filtered.length === 0 && (
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
