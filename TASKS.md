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
POST-VS7 — Decisions Needed
===========================

The following roadmap items depend on product direction changes vs current constraints in SPEC.md
and this file’s GLOBAL CONSTRAINTS (no payments; manager invites only).

- Do we want to allow payments (Stripe) in-app, or keep billing fully manual/off-platform?
- Do we want any public entry point, or keep the app fully invite-only with no public pages?

============================================================
VERTICAL SLICE 8 — Customer “Request Access” (Public Page → Manager Invite)
==========================================================================

GOAL:
Let prospective customers submit a registration request without creating an account.
Managers review requests and invite customers using the existing manager-invite flow.

STATUS: NOT STARTED

---

## VS8 — Capabilities

- Public page: “Request access” (no auth) to submit:
  - parent name
  - email
  - student name(s)
  - grade(s) / subjects
  - scheduling constraints + notes
- Manager view:
  - inbox/table of requests (new → reviewed → invited → closed)
  - one-click “Invite customer” action (creates invite, marks request as invited)
  - audit trail (who reviewed/invited, timestamps)

---

## VS8 — Constraints

- Must not create a customer account automatically (still manager-invites-only)
- Abuse protection for public form (rate limit + basic bot mitigation)
- All request data stored in Postgres with RLS (default deny; manager-only read)

---

## VS8 — Exit Criteria

- Requests reliably captured and visible to managers
- Invites issued only by managers
- No cross-tenant leakage (single-org, but still strict customer isolation)
- E2E test covers request submit → manager invite flow

============================================================
VERTICAL SLICE 9 — Stripe Integration (Billing) [BLOCKED BY SPEC]
===============================================================

GOAL:
Add Stripe-based billing workflows (invoices/subscriptions) to reduce manual admin effort.

STATUS: BLOCKED (SPEC.md says “No payments”)

---

## VS9 — Pre-Work (Unblock)

- Update SPEC.md Non-Goals to explicitly allow the chosen billing scope
- Update GLOBAL CONSTRAINTS in this file accordingly (define what “payments” means here)
- Decide billing scope:
  - Option A: Stripe invoices only (no in-app checkout; manager-triggered invoices)
  - Option B: Stripe subscriptions (auto-renew; webhook-driven state)
  - Option C: Hybrid (membership hours + Stripe invoice ledger)

---

## VS9 — Capabilities (If Unblocked)

- Manager can link a customer to a Stripe Customer record (store `stripe_customer_id`)
- Manager can create and send invoices (Stripe-hosted payment page)
- Webhook sync:
  - invoice created/sent/paid/voided
  - subscription status changes (if enabled)
- App surfaces billing status read-only to customers (no sensitive payment details stored)
- Membership renewal hooks (if enabled) update membership hours based on paid invoice/subscription period

---

## VS9 — Constraints

- No card data stored in app (Stripe-hosted flows only)
- Webhooks must be verified and idempotent
- RLS for all billing data (manager read/write; customer read-only for their own)
- Comprehensive tests (unit for webhook handlers + Playwright smoke for manager flows)

---

## VS9 — Exit Criteria

- Stripe events reliably reconcile to internal billing state
- No double-application of renewals/adjustments (idempotent)
- No payment info leakage
- All tests green

============================================================
GENERAL RULES
=============

- Only Main Dev merges into main
- DB Agent cannot touch app code
- QA Agent cannot change schema or feature logic
- Watchdog runs tests/lint and reports only
- No slice starts until previous slice is merged and green
