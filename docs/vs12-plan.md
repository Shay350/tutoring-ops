# VS12 Public Site Redesign Plan

## Goals
- Redesign the public-facing pages with a calm, academic, parent-friendly tone.
- Preserve invite-only positioning with clear access actions.
- Introduce a reusable editorial-style component system for all public pages.

## Global Rules
- Never use **Sign up** or **Get started**.
- Allowed CTAs: **Sign in** and **Request an invite**.
- Visual tone: slate/stone base, sky accent, generous whitespace, minimal effects.
- Avoid startup visual patterns (gradients, glow shapes, glassmorphism, dense card stacks).

## Navigation Structure
Primary nav (all pages):
1. Home (`/`)
2. About (`/about`)
3. Structure (`/structure`)
4. Donation (`/donation`)
5. Sign in (`/login`)

Footer repeats route links and invite-only note.

## Reusable Components
- `PublicContainer` – max width and horizontal padding.
- `Section` – vertical rhythm and optional intro heading.
- `PageHeader` – page title, eyebrow, and subtitle.
- `Hero` – homepage hero with primary and secondary CTA.
- `TrustStrip` – compact trust indicators.
- `ProcessSteps` – numbered process list.
- `FeatureHighlight` – split section for “what families get”.
- `EditorialText` – readable long-form content block.
- `CTASection` – page-closing CTA panel.
- `PublicNavbar` and `PublicFooter` – shared framing.

## Wireframes / Section Hierarchy

### Home (`/`)
1. Hero
2. Trust strip
3. How it works
4. What families get
5. Structure preview
6. Donation teaser
7. Final CTA

### About (`/about`)
1. Page header
2. Mission
3. Teaching philosophy
4. Matching process
5. Expectations
6. Organization story
7. Invite-only note
8. Final CTA

### Structure (`/structure`)
1. Page header
2. Who it’s for
3. Subjects
4. Session format
5. Weekly rhythm
6. Progress tracking
7. FAQ
8. Final CTA

### Donation (`/donation`)
1. Page header
2. Why donations matter
3. What support funds
4. Impact examples
5. Transparency note
6. FAQ
7. Final CTA

## CTA Rules
- Primary CTA on public pages: **Request an invite**.
- Secondary CTA: **Sign in**.
- Place a clear CTA at the end of each page.
- Keep language service-oriented and non-salesy.
