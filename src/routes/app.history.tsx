/**
 * Renders the mobile "history" screen: summary stat cards, a score-trend
 * chart, a list of past sessions for the current month, and an empty-state
 * prompt for earlier history. Uses static demo data.
 *
 * - NativeHistory(): main route component; renders the stats, chart, and
 *   session history list.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import { NativeTabScreen } from "@/components/pm/native-shell";
import { EmptyState, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { ProgressChart, SessionRow, StatCard } from "@/components/pm/blocks";
import { history, stats } from "@/lib/demo";

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [
      { title: "History · PlaceMe Mobile" },
      { name: "description", content: "Your past group discussions and AI scores on mobile." },
      { property: "og:title", content: "History · PlaceMe Mobile" },
      { property: "og:description", content: "Track your GD progress week over week." },
    ],
  }),
  component: NativeHistory,
});

// Main route component: renders the stat cards, score-trend chart, monthly
// session history list, and the empty-state prompt for earlier history.
function NativeHistory() {
  return (
    <NativeTabScreen title="History">
      <div className="space-y-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.slice(0, 2).map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
        <PmCard className="p-4">
          <SectionTitle title="Score trend" subtitle="Last 6 weeks" />
          <ProgressChart />
        </PmCard>
        <div>
          <SectionTitle title="July 2026" subtitle="5 sessions" />
          <div className="space-y-3">
            {history.map((s) => (
              <SessionRow key={s.id} s={s} to="/app/ended" />
            ))}
          </div>
        </div>
        <EmptyState
          icon={<CalendarClock />}
          title="Nothing before July"
          description="You joined PlaceMe this month."
          action={
            <PmButton asChild size="sm">
              <Link to="/app/match">Start a session</Link>
            </PmButton>
          }
        />
      </div>
    </NativeTabScreen>
  );
}
