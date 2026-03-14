import Link from "next/link";

import { navItems } from "@/content/public-copy";

import { PublicContainer } from "./primitives";

export function PublicNavbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <PublicContainer className="flex h-16 items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-wide text-slate-900">
          Tutoring Ops
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-5 text-sm text-slate-700">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </PublicContainer>
    </header>
  );
}
