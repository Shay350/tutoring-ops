import Link from "next/link";

import { navItems } from "@/content/public-copy";

import { PublicContainer } from "./primitives";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <PublicContainer className="space-y-4">
        <p className="text-sm font-medium text-slate-900">Tutoring Ops</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4 text-sm text-slate-600">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="max-w-2xl text-sm leading-7 text-slate-500">
          Invite-only onboarding helps us protect tutor quality, family communication, and student continuity.
        </p>
      </PublicContainer>
    </footer>
  );
}
