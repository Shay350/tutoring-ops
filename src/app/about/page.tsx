import { PublicPageShell } from "@/components/public/page-shell";
import { CTASection, EditorialText, PageHeader, Section } from "@/components/public/primitives";
import { aboutCopy } from "@/content/public-copy";

export default function AboutPage() {
  return (
    <PublicPageShell>
      <Section className="pt-10 md:pt-16">
        <PageHeader
          eyebrow="About"
          title="A tutoring program built on clarity, consistency, and care."
          body="We design tutoring support that feels calm and organized for families, while staying academically serious for students."
        />
      </Section>

      <Section className="border-t border-slate-200">
        <div className="space-y-10">
          <EditorialText title="Mission" body={aboutCopy.mission} />
          <EditorialText title="Teaching philosophy" body={aboutCopy.philosophy} />
          <EditorialText title="Matching process" body={aboutCopy.matching} />
          <EditorialText title="Expectations" body={aboutCopy.expectations} />
          <EditorialText title="Organization story" body={aboutCopy.story} />
          <EditorialText title="Invite-only" body={aboutCopy.inviteOnly} />
        </div>
      </Section>

      <CTASection
        title="Need support for your student?"
        body="Request an invite to begin a thoughtful onboarding process, or sign in if your family is already part of the program."
      />
    </PublicPageShell>
  );
}
