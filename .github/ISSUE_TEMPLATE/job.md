---
name: Job
about: One small, agent-ready unit of work with a clear "Done means"
title: "[JOB-ID] "
labels: job
assignees: ""
---

<!--
One job = one branch = one PR. Keep it small enough for one agent session.
Agents: read AGENTS.md first; treat "Done means" as the acceptance bar and
"Out of scope" as a hard boundary.
-->

## Job ID

<!-- e.g. W0-5 / SCRUM-84 -->

## Goal

<!-- One or two sentences: what outcome, for whom, and why. -->

## Files

<!-- Files/folders expected to change (and any that must NOT change). -->

-

## Done means

<!-- Checkable acceptance criteria. The PR is done only when every box is ticked. -->

- [ ]
- [ ] Tests, lint and build pass locally and in CI
- [ ] OpenAPI / migrations / docs updated if touched

## Test cases

<!-- Concrete cases: given / when / then. Include at least one failure path. -->

1.

## Out of scope

<!-- What this job must not do. Anything here becomes a separate job. -->

-
