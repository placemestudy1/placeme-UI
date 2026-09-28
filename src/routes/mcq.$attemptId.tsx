/**
 * MCQ test page (SPEC-0017): a focused full-screen layout (no WebShell) with
 * a server-owned timer, section tabs, the question card, the navigator and a
 * bottom dock. All attempt state lives in useMcqAttempt.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, X } from "lucide-react";

import { ProtectedRoute } from "@/components/pm/protected-route";
import { EmptyState, ErrorState, PmButton } from "@/components/pm/kit";
import { McqTopBar } from "@/components/mcq/mcq-top-bar";
import { McqBreadcrumbBar } from "@/components/mcq/mcq-breadcrumb-bar";
import { McqQuestionCard } from "@/components/mcq/mcq-question-card";
import { McqNavigator } from "@/components/mcq/mcq-navigator";
import { McqBottomDock } from "@/components/mcq/mcq-bottom-dock";
import { McqInstructionsDrawer } from "@/components/mcq/mcq-instructions-drawer";
import { McqCalculator } from "@/components/mcq/mcq-calculator";
import { McqPaperModal } from "@/components/mcq/mcq-paper-modal";
import { McqSubmitModal } from "@/components/mcq/mcq-submit-modal";
import type { TimeAlert } from "@/components/mcq/mcq-time-alert";
import { useAuth } from "@/lib/auth-context";
import { requireFeatureFlag } from "@/lib/feature-flags";
import type { QuestionState, SectionGroup } from "@/lib/mcq/mcq-types";
import { crossedWarning, warningText } from "@/lib/mcq/timer";
import { useMcqAttempt } from "@/lib/mcq/use-mcq-attempt";

export const Route = createFileRoute("/mcq/$attemptId")({
  head: () => ({ meta: [{ title: "Practice test · PlaceMe" }] }),
  // SPEC-0017 R9 / SCRUM-91: a plain 404 while the `mcq` flag is off.
  // Client-only: the page runs on local storage and timers, so server
  // rendering adds nothing, and the flag check below then runs in the
  // browser like every other feature_flags read.
  ssr: false,
  beforeLoad: ({ context }) => requireFeatureFlag(context.queryClient, "mcq"),
  component: () => (
    // SPEC-0017 R13: no mic or audio, so no consent gate -- sign-in only.
    <ProtectedRoute requireConsent={false}>
      <AssessmentPage />
    </ProtectedRoute>
  ),
});

function AssessmentPage() {
  const { attemptId } = Route.useParams();
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const run = useMcqAttempt(attemptId, session);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [paperOpen, setPaperOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [warning, setWarning] = useState<TimeAlert | null>(null);
  const previousRemaining = useRef<number | null>(null);
  const timedOut =
    run.submitTrigger === "timeout" || (run.status === "ready" && run.remaining <= 0);

  const candidateName =
    (user?.user_metadata?.["display_name"] as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Student";

  useEffect(() => {
    if (run.status === "submitted") {
      void navigate({ to: "/mcq/results/$attemptId", params: { attemptId }, replace: true });
    }
  }, [run.status, attemptId, navigate]);

  // 1:00 and 0:30 warnings. Only live crossings count.
  useEffect(() => {
    if (run.status !== "ready") return;
    const mark = crossedWarning(previousRemaining.current, run.remaining);
    previousRemaining.current = run.remaining;
    if (mark !== null) setWarning({ kind: "warning", text: warningText(mark) });
  }, [run.remaining, run.status]);

  // Each warning stays up for 6s (keyed on the warning, not the clock tick,
  // so the per-second re-render doesn't cancel it).
  useEffect(() => {
    if (!warning) return undefined;
    const hide = setTimeout(() => setWarning(null), 6000);
    return () => clearTimeout(hide);
  }, [warning]);

  // At 0:00 the test submits on its own: no confirmation dialog, even if
  // the student had "Finish test" open.
  useEffect(() => {
    if (timedOut) setSubmitOpen(false);
  }, [timedOut]);

  const { attempt, questions } = run;
  const currentIndex = attempt?.currentIndex ?? 0;
  const current = questions[currentIndex];
  const currentAnswer = current ? attempt?.answers[current.id] : undefined;

  const sections = useMemo<SectionGroup[]>(() => {
    const groups: SectionGroup[] = [];
    questions.forEach((q, i) => {
      const g = groups.find((x) => x.section === q.section);
      if (g) g.indexes.push(i);
      else groups.push({ section: q.section, indexes: [i] });
    });
    return groups;
  }, [questions]);

  const states = useMemo<QuestionState[]>(
    () =>
      questions.map((q) => {
        const a = attempt?.answers[q.id];
        const selected = a?.c ?? null;
        return {
          questionId: q.id,
          selectedAnswer: selected,
          isFlagged: a?.r ?? false,
          isVisited: attempt?.visited.includes(q.id) ?? false,
          isAnswered: selected !== null,
        };
      }),
    [questions, attempt],
  );

  const answered = states.filter((s) => s.isAnswered).length;
  const flagged = states.filter((s) => s.isFlagged).length;
  const notVisited = states.filter((s) => !s.isVisited).length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;

  const next = () => (isLast ? setSubmitOpen(true) : run.goTo(currentIndex + 1));
  const prev = () => run.goTo(currentIndex - 1);
  const clear = () => run.setAnswer(null);
  const jumpToSection = (section: string) => {
    const first = sections.find((s) => s.section === section)?.indexes[0];
    if (first !== undefined) run.goTo(first);
  };

  // Keyboard shortcuts, off while a dialog or the calculator has focus.
  useEffect(() => {
    if (run.status !== "ready" || submitOpen || paperOpen || instructionsOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input:not([type=radio]), textarea, select, [role=dialog]")) return;
      const key = e.key.toUpperCase();
      if (["1", "2", "3", "4"].includes(key)) run.setAnswer(Number(key) - 1);
      else if (key === "N") next();
      else if (key === "P") prev();
      else if (key === "F") run.toggleFlag();
      else if (key === "C") clear();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (run.status === "loading" || run.status === "submitted") {
    return (
      <div className="aurora flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your test…</p>
      </div>
    );
  }

  if (run.status === "error" || !attempt || !current) {
    return (
      <div className="aurora grid min-h-screen place-items-center bg-background p-4">
        <div className="w-full max-w-md">
          <ErrorState
            title="We couldn't open this test"
            {...(run.error ? { description: run.error } : {})}
          />
          <PmButton asChild variant="outline" block className="mt-4">
            <Link to="/mcq">Back to practice tests</Link>
          </PmButton>
        </div>
      </div>
    );
  }

  const navigator = (onJump: (i: number) => void) => (
    <McqNavigator
      sections={sections}
      activeSection={current.section}
      onSectionChange={jumpToSection}
      states={states}
      currentIndex={currentIndex}
      onJumpTo={onJump}
      onViewPaper={() => setPaperOpen(true)}
    />
  );

  return (
    <div className="aurora min-h-screen bg-background">
      <McqTopBar
        testName={run.test?.name ?? "Practice test"}
        candidateName={candidateName}
        remainingSeconds={run.remaining}
        sections={sections}
        activeSection={current.section}
        onSectionChange={jumpToSection}
        flaggedCount={flagged}
        onTogglePalette={() => setPaletteOpen((o) => !o)}
        onFinish={() => setSubmitOpen(true)}
        timeAlert={timedOut ? { kind: "timeout" } : warning}
        onDismissTimeAlert={() => setWarning(null)}
      />

      <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-32 lg:px-6">
        <McqBreadcrumbBar
          section={current.section}
          topic={current.topic}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          answeredTotal={answered}
          onInstructionsOpen={() => setInstructionsOpen(true)}
          onCalculatorToggle={() => setCalculatorOpen((o) => !o)}
        />

        <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <McqQuestionCard
              question={current}
              number={currentIndex + 1}
              selectedAnswer={currentAnswer?.c ?? null}
              isFlagged={currentAnswer?.r ?? false}
              onAnswer={run.setAnswer}
              onClearAnswer={clear}
              onFlag={run.toggleFlag}
              onPrevious={prev}
              onNext={next}
              isFirst={isFirst}
              isLast={isLast}
            />
          </div>
          <aside className="sticky top-32 hidden xl:col-span-4 xl:block">
            {navigator(run.goTo)}
          </aside>
        </div>
      </main>

      {paletteOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end xl:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setPaletteOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Question palette"
            className="relative h-full w-[360px] max-w-full overflow-y-auto border-l border-border bg-background p-4"
          >
            <div className="mb-3 flex justify-end">
              <PmButton
                variant="ghost"
                size="iconSm"
                onClick={() => setPaletteOpen(false)}
                aria-label="Close palette"
              >
                <X />
              </PmButton>
            </div>
            {navigator((i) => {
              run.goTo(i);
              setPaletteOpen(false);
            })}
          </div>
        </div>
      ) : null}

      <McqBottomDock
        onPrevious={prev}
        onClearAnswer={clear}
        onFlag={run.toggleFlag}
        onNext={next}
        isFirst={isFirst}
        isLast={isLast}
        hasAnswer={(currentAnswer?.c ?? null) !== null}
        isFlagged={currentAnswer?.r ?? false}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        answeredTotal={answered}
      />

      <McqInstructionsDrawer open={instructionsOpen} onClose={() => setInstructionsOpen(false)} />
      <McqCalculator open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
      <McqPaperModal
        open={paperOpen}
        onClose={() => setPaperOpen(false)}
        section={current.section}
        questions={(sections.find((s) => s.section === current.section)?.indexes ?? []).flatMap(
          (i) => {
            const q = questions[i];
            return q ? [[i, q] as [number, typeof q]] : [];
          },
        )}
        currentIndex={currentIndex}
        onJumpTo={run.goTo}
      />
      <McqSubmitModal
        open={!timedOut && (submitOpen || run.status === "submitting")}
        submitting={run.status === "submitting"}
        error={run.error}
        onCancel={() => setSubmitOpen(false)}
        onConfirm={() => void run.submit("student")}
        stats={{ answered, flagged, notVisited, total: questions.length }}
      />
    </div>
  );
}
