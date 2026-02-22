# AGENTS — operating rules
Source of truth (read in this order):
1) TASKS.md
2) SPEC.md
3) ARCHITECTURE.md

Hard rules:
- Single-org internal tool
- Roles: Manager/Tutor/Customer
- Manager invites only; no public onboarding
- Supabase Auth + Postgres + RLS required for all data
- No drag-drop calendars, no payments, no fully autonomous AI actions
- No schema changes without RLS
- No merge with failing tests
- Main Dev is only one who merges to main

Dev workflow:
- All changes land via PRs (no direct pushes to `main`) unless explicitly approved as a one-off.
- Use stacked PRs for multi-agent work (DB/RLS first, then app, then QA/tests).
