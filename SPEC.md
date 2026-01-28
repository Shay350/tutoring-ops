# Tutoring Ops App — Specification

## Goal
Build an internal, single-organization web application to manage tutoring operations:
customers, tutors, students, scheduling, session logs, progress tracking, and communication.

This is an internal ops tool — not a public SaaS.

## Core Principles
- Ops-first UI (tables and forms over flashy UX)
- Deterministic logic
- Light blue, professional design (shadcn + Tailwind)
- AI is assistive only (drafts, summaries, explanations)
- All AI outputs require human review

## User Roles
### Manager
- Intake pipeline
- Tutor ↔ student matching
- Master schedule
- Manage students and tutors
- Reports, templates, settings
- Full visibility across system

### Tutor
- View assigned schedule
- Log sessions (topics, struggles, homework, next steps)
- Track student progress
- Draft parent updates (AI-assisted, editable)

### Customer (Parent / Student)
- Read-only access
- View progress and session history
- View upcoming schedule
- Membership details (no payments v1)
- Message managers

## Non-Goals (V1)
- No multi-organization support
- No public onboarding
- No payments
- No drag-and-drop calendar
- No autonomous AI decisions
- No native mobile app

## Tech Stack
- Next.js (App Router)
- Tailwind CSS
- shadcn/ui
- Supabase Auth + Postgres + RLS
- Supabase Storage (files)
- Vercel hosting

## Routing Convention
- /login
- /manager/**
- /tutor/**
- /customer/**

Users are redirected to the correct area after login based on role.

## Data Model (Initial)
- auth.users (Supabase)
- public.profiles
  - id (uuid, pk, fk -> auth.users.id)
  - role ('manager' | 'tutor' | 'customer')
  - full_name
  - created_at

## Security
- Row Level Security enabled everywhere
- Default deny
- Access granted explicitly per role
- Managers can read all profiles
- Users can read their own profile

