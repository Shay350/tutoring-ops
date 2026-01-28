import AppShell, { type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/customer" },
  { label: "Students", href: "/customer/students" },
  { label: "Calendar", href: "/customer/calendar" },
  { label: "Messages", href: "/customer/messages" },
];

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("customer");

  return (
    <AppShell
      title="TutorOps"
      badge="Customer"
      homeHref="/customer"
      navItems={navItems}
    >
      {children}
    </AppShell>
  );
}
