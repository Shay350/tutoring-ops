import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { roleLabel, roleToPath, type Role } from "@/lib/roles";

const NAV_ITEMS: Record<Role, { label: string; href: string }[]> = {
  customer: [
    { label: "Dashboard", href: "/customer" },
    { label: "Students", href: "/customer/students" },
    { label: "Calendar", href: "/customer/calendar" },
    { label: "Messages", href: "/customer/messages" },
  ],
  tutor: [
    { label: "Today", href: "/tutor" },
    { label: "Schedule", href: "/tutor/schedule" },
    { label: "Students", href: "/tutor/students" },
    { label: "Messages", href: "/tutor/messages" },
  ],
  manager: [
    { label: "Dashboard", href: "/manager" },
    { label: "Pipeline", href: "/manager/pipeline" },
    { label: "Master Schedule", href: "/manager/schedule" },
    { label: "Reports", href: "/manager/reports" },
  ],
};

type AppShellProps = {
  role: Role;
  userName?: string | null;
  children: React.ReactNode;
};

export default function AppShell({ role, userName, children }: AppShellProps) {
  const items = NAV_ITEMS[role];

  return (
    <div className="min-h-screen bg-sky-50/60">
      <header className="border-b border-border/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link className="text-lg font-semibold text-sky-900" href={roleToPath(role)}>
              TutorOps
            </Link>
            <Badge variant="secondary" className="rounded-md bg-sky-100 text-sky-700">
              {roleLabel(role)}
            </Badge>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {userName ? `Signed in as ${userName}` : "Signed in"}
            </span>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Switch account
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
