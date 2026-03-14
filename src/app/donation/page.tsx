import { PublicPageShell } from "@/components/public/page-shell";
import { CTASection, EditorialText, PageHeader, Section } from "@/components/public/primitives";
import { donationCopy } from "@/content/public-copy";

export default function DonationPage() {
  return (
    <PublicPageShell>
      <Section className="pt-10 md:pt-16">
        <PageHeader
          eyebrow="Donation"
          title="Support consistent tutoring access for more families."
          body="Donations help sustain reliable academic support for students who benefit from continuity but may face financial constraints."
        />
      </Section>

      <Section className="border-t border-slate-200">
        <div className="space-y-10">
          <EditorialText title="Why donations matter" body={donationCopy.whyItMatters} />

          <article className="max-w-3xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">What support funds</h2>
            <ul className="space-y-3 text-base leading-8 text-slate-700">
              {donationCopy.whatFundsSupport.map((item) => (
                <li key={item} className="border-l-2 border-sky-200 pl-4">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="max-w-3xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Impact examples</h2>
            <ul className="space-y-3 text-base leading-8 text-slate-700">
              {donationCopy.impactExamples.map((item) => (
                <li key={item} className="border-l-2 border-slate-200 pl-4">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <EditorialText title="Transparency note" body={donationCopy.transparency} />

          <article className="max-w-3xl space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">FAQ</h2>
            <dl className="space-y-4">
              {donationCopy.faq.map((item) => (
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
        title="Interested in supporting this work?"
        body="Request an invite to connect with the team, or sign in if you already have portal access."
      />
    </PublicPageShell>
  );
}
