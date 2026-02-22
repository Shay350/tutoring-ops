# VS9 Multi-Agent Workflow (Intake -> Automated Slotting)

This doc is the operating contract for running VS9 with multiple agents via stacked PRs.

Repo rules:

- Only Main Dev merges to `main`.
- No merge with failing tests (`npm run test:all`).
- No schema changes without RLS (default deny).

## Goal

After an intake is submitted, generate deterministic slotting suggestions (not auto-schedule).
Managers review and approve suggestions, which then create scheduled sessions.

## PR Stack (Merge Order)

1. `vs9-db-suggestions` (DB Agent)
2. `vs9-generator-actions` (App Agent)
3. `vs9-manager-review-ui` (App Agent)
4. `vs9-tests` (QA Agent)

Each PR should be independently reviewable and keep changes scoped to its role.

## Interface Contract (Freeze Early)

Before starting App/QA work, freeze the following:

- Table names + column names for suggestions
- Suggestion status lifecycle (e.g. `new -> approved -> rejected`)
- Approval action signature (inputs, idempotency key)
- Required routes and `data-testid` hooks for E2E

If this contract changes, update this doc and note which PRs must rebase.

## Agent Responsibilities

DB Agent (PR 1):

- Create suggestion table(s) + indexes
- RLS: default deny, manager-only read/write
- Any required DB functions/views (optional, keep minimal)
- Verification SQL if helpful

App Agent (PR 2+3):

- Deterministic generator (operating hours + tutor capacity + intake constraints)
- Store suggestions in DB (no side effects beyond suggestions)
- Manager review UI: show ranked suggestions + "why this slot"
- Approval creates sessions; must respect operating hours and prepaid guardrails

QA Agent (PR 4):

- Unit tests for generator ranking + edge cases
- Playwright E2E: intake submit -> suggestions appear -> approve -> sessions created
- Deterministic fixtures and stable selectors

## PR Template (Use In Each PR)

Title: `feat(vs9): <short description>`

Description:

- Summary:
- Changes:
- How to test:
- RLS/security notes:
- Screenshots (if UI):
- Follow-ups / next PR:

Tag reviewers:

- `@codex`
