import AppShell, { type NavItem } from "@/components/app-shell";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/customer" },
  { label: "Students", href: "/customer/students" },
  { label: "Calendar", href: "/customer/calendar" },
  { label: "Messages", href: "/customer/messages" },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
