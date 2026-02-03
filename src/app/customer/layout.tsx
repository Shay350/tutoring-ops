import AppShell, { type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems: NavItem[] = [
  { label: "Students", href: "/customer" },
  { label: "Membership", href: "/customer/membership", testId: "nav-customer-membership" },
  { label: "Intake", href: "/customer/intake" },
  { label: "Upcoming Sessions", href: "/customer/schedule" },
  { label: "Session History", href: "/customer/history" },
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
