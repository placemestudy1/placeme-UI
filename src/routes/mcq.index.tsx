/**
 * Practice-test picker (SPEC-0017 flow step 1). The test list comes from the
 * public bundle on the CDN -- no API call until the student presses Start.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Clock3, ListChecks, PlayCircle } from "lucide-react";

import { WebShell } from "@/components/pm/web-shell";
import { ProtectedRoute } from "@/components/pm/protected-route";
import { Banner, CardSkeleton, ErrorState, PmBadge, PmButton, PmCard } from "@/components/pm/kit";
import { useAuth } from "@/lib/auth-context";
import { requireFeatureFlag } from "@/lib/feature-flags";
import { startMcqAttempt } from "@/lib/api";
import { attemptFromStart, getOpenAttemptId, loadAttempt } from "@/lib/mcq/attempt-store";
import { bankClient } from "@/lib/mcq/bank";
import { sectionLabel, type BankTest } from "@/lib/mcq/mcq-types";

export const Route = createFileRoute("/mcq/")({
  head: () => ({
    meta: [
      { title: "Practice tests · PlaceMe" },
      { name: "description", content: "Timed aptitude and technical MCQ practice tests." },
    ],
  }),
  // Client-only: the page runs on local storage and timers, so server
  // rendering adds nothing, and the flag check below then runs in the
  // browser like every other feature_flags read.
  ssr: false,
  beforeLoad: ({ context }) => requireFeatureFlag(context.queryClient, "mcq"),
  component: () => (
    <ProtectedRoute requireConsent={false}>
      <PracticeTestsPage />
    </ProtectedRoute>
  ),
});

function PracticeTestsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<BankTest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const openAttemptId = getOpenAttemptId();
  const openAttempt = openAttemptId ? loadAttempt(openAttemptId) : null;

  function load() {
    setLoadError(null);
    bankClient
      .getCurrentBank()
      .then((bank) => setTests(bank.tests))
      .catch((e: Error) => setLoadError(e.message));
  }
  useEffect(load, []);

  async function start(test: BankTest) {
    setStarting(test.id);
    setStartError(null);
    try {
      // Returns the already-open attempt instead when there is one (any
      // test), so a double click or a second device lands on the same test.
      const res = await startMcqAttempt(session, test.id);
      attemptFromStart(res, Date.now());
      await navigate({ to: "/mcq/$attemptId", params: { attemptId: res.attemptId } });
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Couldn't start the test.");
      setStarting(null);
    }
  }

  const openTestName = tests?.find((t) => t.id === openAttempt?.testId)?.name;

  return (
    <WebShell
      title="Practice tests"
      subtitle="Timed aptitude and technical MCQs with answers and explanations after you submit."
    >
      {openAttempt ? (
        <Banner
          tone="info"
          title={`You have ${openTestName ? `"${openTestName}"` : "a test"} in progress`}
          description="The timer kept running while you were away."
          action={
            <PmButton asChild size="sm">
              <Link to="/mcq/$attemptId" params={{ attemptId: openAttempt.attemptId }}>
                Resume <ArrowRight />
              </Link>
            </PmButton>
          }
        />
      ) : null}

      {startError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {startError}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loadError ? (
          <ErrorState
            className="md:col-span-2 xl:col-span-3"
            description={loadError}
            onRetry={load}
          />
        ) : !tests ? (
          [0, 1, 2].map((i) => <CardSkeleton key={i} />)
        ) : (
          tests.map((test) => (
            <PmCard key={test.id} className="flex flex-col gap-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary-glow">
                  <ListChecks className="size-6" />
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {Object.entries(test.sectionMix).map(([section, count]) => (
                    <PmBadge key={section} tone={section === "technical" ? "accent" : "primary"}>
                      {sectionLabel(section)} · {count}
                    </PmBadge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">{test.name}</h3>
                <p className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{test.questionCount} questions</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-4" /> {Math.round(test.durationSeconds / 60)} min
                  </span>
                </p>
              </div>
              <PmButton
                className="mt-auto"
                block
                onClick={() => void start(test)}
                loading={starting === test.id}
                disabled={starting !== null}
              >
                <PlayCircle /> Start test
              </PmButton>
            </PmCard>
          ))
        )}
      </div>
    </WebShell>
  );
}
