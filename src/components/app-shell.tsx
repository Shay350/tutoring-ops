import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export type NavItem = { label: string; href: string };

type AppShellProps = {
  title: string;
  badge: string;
  homeHref: string;
  navItems: NavItem[];
  children: React.ReactNode;
};

export default function AppShell({
  title,
  badge,
  homeHref,
  navItems,
  children,
}: AppShellProps) {

  return (
    <div className="min-h-screen bg-sky-50/60">
      <header className="border-b border-border/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link className="text-lg font-semibold text-sky-900" href={homeHref}>
              {title}
            </Link>
            <Badge variant="secondary" className="rounded-md bg-sky-100 text-sky-700">
              {badge}
            </Badge>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="text-xs text-muted-foreground">Internal build</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
