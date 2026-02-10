import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "Amazing tutors, matched thoughtfully",
    body: "We pair students with tutors who can teach and motivate—because progress is built on trust.",
  },
  {
    title: "Clear progress you can feel",
    body: "Session notes, momentum, and next steps stay visible—so families know what’s improving and why.",
  },
  {
    title: "Scheduling that respects real life",
    body: "Recurring sessions, reschedules, and a shared view across families, tutors, and managers.",
  },
];

const proofPoints = [
  { label: "Consistent weekly sessions", value: "Cadence" },
  { label: "Actionable session logs", value: "Clarity" },
  { label: "Progress snapshots over time", value: "Momentum" },
  { label: "Manager oversight + messaging", value: "Support" },
];

const steps = [
  {
    title: "Request an invite",
    body: "We’re invite-only so we can keep quality high and onboarding smooth.",
  },
  {
    title: "Get matched",
    body: "A manager reviews goals, availability, and learning style to match a tutor.",
  },
  {
    title: "Track progress",
    body: "After each session, you’ll see a clear summary and next steps—no guessing.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(1200px_700px_at_10%_0%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(900px_600px_at_90%_10%,rgba(99,102,241,0.12),transparent_50%),linear-gradient(to_bottom,rgba(240,249,255,1),rgba(255,255,255,1))]">
      <main className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
        <div className="relative">
          <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute -right-32 -top-10 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
                High-quality tutoring, invite-only
              </div>

              <div className="space-y-4">
                <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                  Tutoring Ops
                  <br />
                  Amazing tutors.
                  <br />
                  Visible progress.
                  <br />
                  Calm, consistent support.
                </h1>
                <p className="max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
                  We help students build real confidence and momentum through
                  thoughtful tutor matching, consistent sessions, and clear
                  next steps after every lesson.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "bg-slate-900 text-white hover:bg-slate-900/90"
                  )}
                >
                  Sign in
                </Link>
                <a
                  href="mailto:hello@tutorops.local?subject=Tutoring%20Invite%20Request"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "border-slate-200 bg-white/70 backdrop-blur hover:bg-white"
                  )}
                >
                  Request an invite
                </a>
                <span className="text-xs text-slate-500">
                  Invite-only onboarding (no public sign-ups).
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {proofPoints.map((point) => (
                  <div
                    key={point.value}
                    className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 shadow-sm backdrop-blur"
                  >
                    <div className="text-sm font-medium text-slate-900">
                      {point.value}
                    </div>
                    <div className="text-sm text-slate-600">{point.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-slate-200/80 bg-white/70 shadow-lg shadow-sky-100/40 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">
                  What families get
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">
                      Session summaries that actually help
                    </div>
                    <div className="text-sm text-slate-600">
                      Topics, wins, struggles, homework, and the plan for next time.
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">
                      A progress snapshot you can trust
                    </div>
                    <div className="text-sm text-slate-600">
                      See momentum over time—without chasing down updates.
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">
                      Fast manager support
                    </div>
                    <div className="text-sm text-slate-600">
                      Messaging is tied to students so context never gets lost.
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 px-4 py-4 text-white">
                  <div className="text-sm font-semibold">A note on access</div>
                  <p className="mt-1 text-sm text-white/80">
                    This is an internal portal. New families are onboarded by
                    invite so we can maintain quality and privacy.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="mt-14 grid gap-4 md:mt-16 md:grid-cols-3">
          {highlights.map((item) => (
            <Card
              key={item.title}
              className="border-slate-200/80 bg-white/70 shadow-sm backdrop-blur"
            >
              <CardHeader>
                <CardTitle className="text-base text-slate-900">
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-slate-600">
                {item.body}
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-14 md:mt-16">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="max-w-2xl text-sm text-slate-600">
              Simple, human-led, and organized around real outcomes.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card
                key={step.title}
                className="border-slate-200/80 bg-white/70 shadow-sm backdrop-blur"
              >
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                      {index + 1}
                    </span>
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-slate-600">
                  {step.body}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-14 md:mt-16">
          <Card className="border-slate-200/80 bg-white/70 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">
                Already invited?
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-2xl text-sm text-slate-600">
                Sign in to view your student’s schedule, progress, and session history.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "bg-slate-900 text-white hover:bg-slate-900/90"
                  )}
                >
                  Sign in
                </Link>
                <Link
                  href="/customer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "border-slate-200 bg-white/70 backdrop-blur hover:bg-white"
                  )}
                >
                  Customer portal
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
