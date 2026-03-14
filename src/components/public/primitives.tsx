import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Children = { children: ReactNode; className?: string };

export function PublicContainer({ children, className }: Children) {
  return <div className={cn("mx-auto w-full max-w-6xl px-6", className)}>{children}</div>;
}

export function Section({ children, className }: Children) {
  return <section className={cn("py-14 md:py-20", className)}>{children}</section>;
}

export function PageHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body: string;
}) {
  return (
    <header className="max-w-3xl space-y-4">
      {eyebrow ? <p className="text-sm font-medium text-sky-700">{eyebrow}</p> : null}
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">{title}</h1>
      <p className="max-w-2xl text-pretty text-base leading-8 text-slate-600 md:text-lg">{body}</p>
    </header>
  );
}

export function Hero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Section className="pt-10 md:pt-16">
      <PageHeader eyebrow={eyebrow} title={title} body={body} />
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a
          href="mailto:hello@tutorops.local?subject=Tutoring%20Invite%20Request"
          className={cn(buttonVariants(), "bg-sky-700 text-white hover:bg-sky-800")}
        >
          Request an invite
        </a>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "border-slate-300")}>
          Sign in
        </Link>
      </div>
    </Section>
  );
}

export function TrustStrip({ items }: { items: string[] }) {
  return (
    <Section className="border-y border-slate-200 py-8 md:py-10">
      <ul className="grid gap-4 text-sm leading-7 text-slate-700 md:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span aria-hidden className="mt-2 inline-block h-2 w-2 rounded-full bg-sky-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function ProcessSteps({ title, intro, steps }: { title: string; intro: string; steps: { title: string; body: string }[] }) {
  return (
    <Section>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">{intro}</p>
      <ol className="mt-8 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="space-y-3 border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-sky-700">Step {index + 1}</p>
            <h3 className="text-lg font-medium text-slate-900">{step.title}</h3>
            <p className="text-base leading-7 text-slate-600">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function FeatureHighlight({ title, items, aside }: { title: string; items: string[]; aside: string }) {
  return (
    <Section className="border-t border-slate-200">
      <div className="grid gap-8 md:grid-cols-[1.2fr,0.8fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <ul className="mt-5 space-y-4 text-base leading-8 text-slate-700">
            {items.map((item) => (
              <li key={item} className="border-l-2 border-sky-200 pl-4">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <aside className="h-fit border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">{aside}</aside>
      </div>
    </Section>
  );
}

export function EditorialText({ title, body }: { title: string; body: string }) {
  return (
    <article className="max-w-3xl space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="text-base leading-8 text-slate-700">{body}</p>
    </article>
  );
}

export function CTASection({ title, body }: { title: string; body: string }) {
  return (
    <Section className="border-t border-slate-200">
      <div className="max-w-3xl space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="text-base leading-8 text-slate-600">{body}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="mailto:hello@tutorops.local?subject=Tutoring%20Invite%20Request"
            className={cn(buttonVariants(), "bg-sky-700 text-white hover:bg-sky-800")}
          >
            Request an invite
          </a>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "border-slate-300")}>
            Sign in
          </Link>
        </div>
      </div>
    </Section>
  );
}
