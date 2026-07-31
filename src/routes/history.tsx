import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Filter } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { EmptyState, PmButton, PmCard, SectionTitle } from "@/components/pm/kit";
import { ProgressChart, SessionRow, StatCard } from "@/components/pm/blocks";
import { history, stats } from "@/lib/demo";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History · PlaceMe" },
      {
        name: "description",
        content: "Every past group discussion with scores, durations and AI feedback.",
      },
      { property: "og:title", content: "Session history · PlaceMe" },
      { property: "og:description", content: "Track your GD scores week over week." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <WebShell
      title="History"
      subtitle="24 sessions · 7h 42m of speaking practice"
      actions={
        <PmButton variant="outline">
          <Filter /> This month
        </PmButton>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
          <div>
            <SectionTitle title="July 2026" subtitle="5 sessions" />
            <div className="space-y-3">
              {history.map((s) => (
                <SessionRow key={s.id} s={s} />
              ))}
            </div>
          </div>
          <div>
            <SectionTitle title="June 2026" />
            <EmptyState
              icon={<CalendarClock />}
              title="No sessions in June"
              description="You joined PlaceMe in July. Keep the streak going."
              action={
                <PmButton asChild size="sm">
                  <Link to="/match">Start a session</Link>
                </PmButton>
              }
            />
          </div>
        </div>
        <aside className="space-y-4">
          <PmCard className="p-5">
            <SectionTitle title="Score trend" subtitle="Last 6 weeks" />
            <ProgressChart />
          </PmCard>
          <PmCard className="p-5">
            <SectionTitle title="Most practiced" />
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex justify-between">
                Tech &amp; careers <span className="text-foreground">11</span>
              </li>
              <li className="flex justify-between">
                Society &amp; policy <span className="text-foreground">8</span>
              </li>
              <li className="flex justify-between">
                Business &amp; economy <span className="text-foreground">5</span>
              </li>
            </ul>
          </PmCard>
        </aside>
      </div>
    </WebShell>
  );
}