# Tutoring Ops

Internal tutoring operations app built to replace spreadsheets, email chains, and scattered tools with one structured system.

Repo: https://github.com/Shay350/tutoring-ops

---

## What this is

Tutoring Ops is a single-organization internal web app used by managers, tutors, and customers.

It handles:

- Customer intake and onboarding
- Tutor assignment and scheduling
- Session logs and progress tracking
- Membership visibility (no payments)
- Messaging between customers and managers
- Reports and CSV exports

This is an ops-first tool. Tables and forms over flashy UI. Deterministic logic over automation. AI is assistive only and never makes decisions.

---

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, RLS, Storage)
- Vercel hosting

---

## Roles

### Customer
- View progress and history
- See upcoming sessions
- View membership info
- Message managers

### Tutor
- View weekly schedule
- Log sessions
- Add notes and progress updates
- Draft parent updates (AI assist, manual approval)

### Manager
- Intake pipeline
- Matching and scheduling
- Templates and communication
- Reports and exports
