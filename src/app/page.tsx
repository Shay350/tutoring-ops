import Link from "next/link";

import { PublicPageShell } from "@/components/public/page-shell";
import {
  CTASection,
  EditorialText,
  FeatureHighlight,
  Hero,
  ProcessSteps,
  Section,
  TrustStrip,
} from "@/components/public/primitives";
import { homeCopy } from "@/content/public-copy";

export default function HomePage() {
  return (
    <PublicPageShell>
      <Hero eyebrow={homeCopy.hero.eyebrow} title={homeCopy.hero.title} body={homeCopy.hero.body} />

      <TrustStrip items={homeCopy.trustStrip} />

      <ProcessSteps
        title="How it works"
        intro="A simple, consistent process designed to support students and keep families informed."
        steps={homeCopy.howItWorks}
      />

      <FeatureHighlight
        title="What families get"
        items={homeCopy.whatFamiliesGet}
        aside="Every session is documented. Families can see what was covered, where support is needed next, and how momentum is building over time."
      />

      <Section className="border-t border-slate-200">
        <EditorialText
          title="Structure preview"
          body="Students receive one-on-one sessions with clear goals, focused teaching, and practical follow-through. Weekly rhythm matters: consistency helps students retain learning and lowers stress for families."
        />
      </Section>

      <Section className="border-t border-slate-200">
        <EditorialText
          title="Donation"
          body="Some families need extra support to keep sessions consistent. Donations help us subsidize tutoring access while preserving the same quality and care standards across the program."
        />
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/donation" className="text-sky-700 underline underline-offset-4 hover:text-sky-800">
            Learn how donations are used
          </Link>
        </p>
      </Section>

      <CTASection
        title="Ready to continue or join the invite list?"
        body="If your family is already onboarded, sign in. If you are exploring support, request an invite and we will follow up with next steps."
      />
    </PublicPageShell>
  );
}
