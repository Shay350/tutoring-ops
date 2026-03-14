import { PublicPageShell } from "@/components/public/page-shell";
import { CTASection, EditorialText, PageHeader, Section } from "@/components/public/primitives";
import { structureCopy } from "@/content/public-copy";

export default function StructurePage() {
  return (
    <PublicPageShell>
      <Section className="pt-10 md:pt-16">
        <PageHeader
          eyebrow="Structure"
          title="How tutoring is organized week to week."
          body="Our structure is intentionally simple: clear goals, consistent sessions, and transparent progress communication for families."
        />
      </Section>

      <Section className="border-t border-slate-200">
        <div className="space-y-10">
          <EditorialText title="Who it’s for" body={structureCopy.whoItsFor} />
          <EditorialText title="Subjects" body={structureCopy.subjects} />
          <EditorialText title="Session format" body={structureCopy.sessionFormat} />
          <EditorialText title="Weekly rhythm" body={structureCopy.weeklyRhythm} />
          <EditorialText title="Progress tracking" body={structureCopy.progressTracking} />

          <article className="max-w-3xl space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">FAQ</h2>
            <dl className="space-y-4">
              {structureCopy.faq.map((item) => (
                <div key={item.q} className="border-l-2 border-slate-200 pl-4">
                  <dt className="text-base font-medium text-slate-900">{item.q}</dt>
                  <dd className="mt-1 text-base leading-8 text-slate-600">{item.a}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>
      </Section>

      <CTASection
        title="Want this structure for your student?"
        body="Request an invite and we will review fit, learning goals, and scheduling availability with you."
      />
    </PublicPageShell>
  );
}
