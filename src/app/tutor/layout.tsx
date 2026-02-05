import AppShell, { type NavItem } from "@/components/app-shell";
import { requireNonCustomer } from "@/lib/auth";

const navItems: NavItem[] = [
  { label: "Today", href: "/tutor" },
  { label: "Schedule", href: "/tutor/schedule" },
  { label: "Students", href: "/tutor/students" },
];

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireNonCustomer();

  return (
    <AppShell
      title="TutorOps"
      badge="Tutor"
      homeHref="/tutor"
      navItems={navItems}
    >
      {children}
    </AppShell>
  );
}
