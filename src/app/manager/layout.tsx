import AppShell, { type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/manager" },
  { label: "Pipeline", href: "/manager/pipeline" },
  { label: "Master Schedule", href: "/manager/schedule" },
  { label: "Invites", href: "/manager/invites" },
  { label: "Reports", href: "/manager/reports" },
];

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("manager");

  return (
    <AppShell
      title="TutorOps"
      badge="Manager"
      homeHref="/manager"
      navItems={navItems}
    >
      {children}
    </AppShell>
  );
}
