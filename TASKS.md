# TASKS — Tutoring Ops App

Vertical-slice driven roadmap. Each slice must be fully end-to-end, production-quality, and leave the app in a working state.

Source of truth:

- SPEC.md for behavior rules / edge cases
- ARCHITECTURE.md for constraints
- This file defines WHAT to build and in WHAT ORDER

============================================================
GLOBAL CONSTRAINTS
==================

- Single organization internal tool
- Roles: Manager, Tutor, Customer
- Supabase Auth + Postgres + RLS required for all data
- No public self-serve onboarding (manager invites only)
- No automated payments
- No mobile app
- No drag-and-drop calendars
- No fully autonomous AI actions
- No schema changes without RLS
- No merge with failing tests

============================================================
VERTICAL SLICE 1 — Intake → Assign → Session Log (Core Backbone)
================================================================

GOAL:
Replace placeholder dashboards with a real, usable tutoring workflow:
Customer submits intake → Manager assigns tutor → Tutor logs session → Customer sees history.

STATUS: COMPLETE

============================================================
VERTICAL SLICE 2 — Scheduling + Master Schedule
===============================================

GOAL:
Turn sessions into a real planning tool for managers, tutors, and customers.

STATUS: COMPLETE (2026-01-29)

============================================================
VERTICAL SLICE 3 — Progress Tracking + At-Risk Flags
====================================================

GOAL:
Make progress measurable and give managers visibility into risk.

STATUS: COMPLETE (2026-01-29)

============================================================
VERTICAL SLICE 4 — Membership Visibility (No Payments)
======================================================

GOAL:
Make “Membership” a real operational concept without automated billing.

STATUS: COMPLETE

---

## VS4 — Domain Model

- Membership
- MembershipAdjustment (audit trail)

---

## VS4 — Capabilities

- Manager can create/update membership (plan, status, hours, renewal)
- Manager can adjust hours with reason (positive/negative)
- Completing a session decrements hours exactly once (idempotent)
- Tutor sees hours remaining (read-only)
- Customer sees membership summary (read-only)

---

## VS4 — Exit Criteria

- Membership hours are the source of truth
- No automated charges
- RLS enforced per role
- E2E tests cover manager/tutor/customer visibility

============================================================
VERTICAL SLICE 5 — Messaging (Customer ↔ Manager)
=================================================

GOAL:
Replace email/DMs with in-app communication tied to students.

STATUS: COMPLETE

---

## VS5 — Capabilities

- Thread per student/customer
- Customer can message manager
- Manager can reply
- Unread indicators
- Strict isolation between customers
- Tutors have no access by default (least privilege)

---

## VS5 — Exit Criteria

- Messages persist
- RLS prevents cross-customer access
- Unread state behaves correctly
- E2E tests pass

============================================================
VERTICAL SLICE 6 — Reports & Exports
====================================

GOAL:
Enable month-end operational reporting for managers.

STATUS: COMPLETE (2026-02-10)

---

## VS6 — Capabilities

- Manager selects a month (YYYY-MM)
- Student monthly summary:
  - session count
  - total hours
  - billed sessions count
  - last session date

- Tutor monthly summary:
  - session count
  - total hours
  - active students count

---

## VS6 — Exports (Server-side only)

- Export sessions CSV for selected month
- Export session_logs CSV for selected month
- Stable headers and ordering
- Manager-only access enforced server-side

---

## VS6 — Testing

- Playwright E2E smoke test (E2E_RUN_VS6=1)
- Deterministic fixtures and dates

---

## VS6 — Deliverables

- Manager reports page (/manager/reports) with month picker and summaries
- Server-side CSV exports (sessions + session_logs)
- Playwright E2E smoke test gated by E2E_RUN_VS6

---

## VS6 — Exit Criteria

- Manager can view accurate monthly summaries
- CSV exports download correctly
- No data leakage
- All tests green

============================================================
POST-VS6 — Decisions Needed
===========================

The following roadmap items depend on product direction changes vs current constraints in SPEC.md
and this file’s GLOBAL CONSTRAINTS (no payments; manager invites only).

- Do we want to allow payments (Stripe payment links) for session packs, or keep billing fully manual/off-platform?
- Do we want a public marketing site (home/about/etc.) even if onboarding stays invite-only?
- Do we want a public “request access” form (no account creation) that routes to manager review + invites?

============================================================
VERTICAL SLICE 8 — Schedule UX + Availability (Calendar + Prepaid Guardrails)
============================================================================

GOAL:
Upgrade scheduling into an ops-grade calendar with clear availability rules, and ensure
upcoming sessions align with prepaid/membership hours.

STATUS: NOT STARTED

---

## VS8 — Capabilities (Manager)

- Calendar view improvements:
  - horizontal / calendar-style view (vs table-first)
  - do not “grey out” full sessions; show them as full/unavailable but readable
- Operating hours:
  - manager-configurable operating hours (by day of week)
  - changes reflect immediately in scheduling UI and slot suggestions
- Availability UX (YouCanBook.me-inspired):
  - clear open/closed time windows
  - capacity / remaining slots visible without hiding context
- Prepaid guardrails:
  - upcoming sessions visibility based on membership hours remaining
  - warnings when schedule exceeds prepaid hours (no silent overbooking)
  - optional hard guard: prevent creating sessions beyond prepaid hours unless manager explicitly overrides (audited)

---

## VS8 — Capabilities (Tutor)

- Tutor schedule is based on assigned/scheduled sessions only (no ambiguous “all sessions” view)
- Tutor sees the tutor assigned to each scheduled slot (ensures “present tutor slotted to time” is the source of truth)

---

## VS8 — Constraints

- No drag-and-drop calendar
- No fully autonomous actions (slotting suggestions are fine; must be manager-approved)
- All config stored in Postgres with RLS (default deny; manager-only write)

---

## VS8 — Exit Criteria

- Calendar view is usable for daily operations
- Operating hours changes are reflected everywhere
- Tutor schedule is derived from assigned sessions
- Prepaid guardrails prevent accidental overscheduling
- E2E coverage for key scheduling paths remains green

============================================================
VERTICAL SLICE 9 — Intake → Automated Slotting (Deterministic Suggestions)
=========================================================================

GOAL:
Reduce manager scheduling time by generating proposed slots after intake, using availability rules
and constraints, while keeping humans in control.

STATUS: NOT STARTED

---

## VS9 — Capabilities

- After customer intake submission, system produces slotting suggestions:
  - based on operating hours + tutor availability + session duration rules
  - respects constraints provided in intake (“TY + slotting”)
  - location-aware once VS10 exists
- Manager reviews and approves suggestions before they become scheduled sessions
- Clear explanation for why a slot was suggested (deterministic, debuggable)

---

## VS9 — Constraints

- No “auto-schedule” without a manager approval action
- No AI requirement (this is deterministic logic)
- All suggestions stored in Postgres with RLS (manager-only)

---

## VS9 — Exit Criteria

- Managers can reliably schedule from intake with minimal manual work
- Suggestions are explainable and correct enough to trust (with human review)
- E2E covers intake → suggestions → approved schedule

---

============================================================
VERTICAL SLICE 10 — Multi-Location Admin (Single Org, Many Locations)
=====================================================================

GOAL:
Support multiple physical/virtual locations inside the single organization:
intake, scheduling, and access controls can be location-aware.

STATUS: NOT STARTED

---

## VS10 — Capabilities

- Admin portal for locations:
  - create/edit locations (name, address/notes, active flag)
  - operating hours can be location-specific (if required)
- Intake updates:
  - intake form includes location dropdown (required)
- Role/location scoping:
  - managers/tutors can be assigned to one or more locations (multi-select)
  - scheduling views filter by location

---

## VS10 — Constraints

- Still single-org (not multi-tenant orgs)
- Schema changes must include RLS (default deny; least privilege)
- No data leakage across customers; location adds another scoping dimension

---

## VS10 — Exit Criteria

- Location-aware scheduling and intake works end-to-end
- Role assignments by location are enforceable via RLS
- E2E covers at least 2 locations with correct isolation

============================================================
VERTICAL SLICE 11 — Public Marketing Site (No Public Onboarding)
===============================================================

GOAL:
Add public pages for marketing and basic info, without enabling self-serve account creation.

STATUS: NOT STARTED

---

## VS11 — Pages

- Home
- About Us
- Structure / Curriculum
- Donation (links to external provider if needed; no app-stored card data)
- Sign in

---

## VS11 — Constraints

- No public self-serve onboarding (accounts still created via manager invite)
- Keep app area behind auth; public pages are read-only

---

## VS11 — Exit Criteria

- Public pages render unauthenticated
- Authenticated app routes remain protected and role-guarded

============================================================
VERTICAL SLICE 12 — Customer “Request Access” (Public Page → Manager Invite)
==========================================================================

GOAL:
Let prospective customers submit a registration request without creating an account.
Managers review requests and invite customers using the existing manager-invite flow.

STATUS: NOT STARTED

---

## VS12 — Capabilities

- Public page: “Request access” (no auth) to submit:
  - parent name
  - email
  - student name(s)
  - grade(s) / subjects
  - location (from locations list, once VS10 exists)
  - scheduling constraints + notes
- Manager view:
  - inbox/table of requests (new → reviewed → invited → closed)
  - one-click “Invite customer” action (creates invite, marks request as invited)
  - audit trail (who reviewed/invited, timestamps)

---

## VS12 — Constraints

- Must not create a customer account automatically (still manager-invites-only)
- Abuse protection for public form (rate limit + basic bot mitigation)
- All request data stored in Postgres with RLS (default deny; manager-only read)

---

## VS12 — Exit Criteria

- Requests reliably captured and visible to managers
- Invites issued only by managers
- E2E test covers request submit → manager invite flow

============================================================
VERTICAL SLICE 13 — Stripe Payment Links (Session Packs) [BLOCKED BY SPEC]
=======================================================================

GOAL:
Enable selling prepaid session packs via Stripe payment links with adjustable quantities,
and reconcile payments back to membership hours.

STATUS: BLOCKED (SPEC.md says “No payments”)

---

## VS13 — Pre-Work (Unblock)

- Update SPEC.md Non-Goals to allow payments via Stripe (define scope explicitly)
- Decide whether donations share the same Stripe account/workflow or remain external-only
- Define how payment quantity maps to membership hours (e.g., 1 qty = N hours)

---

## VS13 — Capabilities (If Unblocked)

- Manager can generate a Stripe payment link for a customer:
  - adjustable quantity for session packs
  - metadata to map payment back to customer/student/location
- Webhook sync (verified + idempotent):
  - payment succeeded → credit membership hours
  - payment refunded/failed → adjust membership hours accordingly (audit trail)
- Customer sees:
  - link to pay
  - read-only payment status + resulting membership hours (no card details stored)

---

## VS13 — Constraints

- Stripe-hosted checkout only; no card data stored in app
- Webhooks must be verified and idempotent
- RLS for all billing data (manager read/write; customer read-only for their own)

---

## VS13 — Exit Criteria

- Stripe events reliably reconcile to membership hours
- No double-application of credits/adjustments (idempotent)
- No payment info leakage
- All tests green

============================================================
VERTICAL SLICE 7 — AI-Assisted Drafts (Human Approval)
======================================================

GOAL:
Introduce AI as a safe productivity aid, never autonomous.

STATUS: NOT STARTED

---

## VS7 — Capabilities

- Tutor clicks “Draft parent update” on a session log
- AI generates draft using session log + progress snapshot
- Tutor edits and approves
- Optional manager review gate
- Customer sees only approved content

---

## VS7 — Constraints

- AI never auto-sends
- All outputs editable
- Clear human-in-the-loop UX

---

## VS7 — Exit Criteria

- Drafts are useful but controlled
- No autonomous actions
- Clear auditability

============================================================
GENERAL RULES
=============

- Only Main Dev merges into main
- DB Agent cannot touch app code
- QA Agent cannot change schema or feature logic
- Watchdog runs tests/lint and reports only
- No slice starts until previous slice is merged and green
