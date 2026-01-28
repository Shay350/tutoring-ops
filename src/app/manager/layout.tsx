import AppShell, { type NavItem } from "@/components/app-shell";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/manager" },
  { label: "Pipeline", href: "/manager/pipeline" },
  { label: "Master Schedule", href: "/manager/schedule" },
  { label: "Reports", href: "/manager/reports" },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
