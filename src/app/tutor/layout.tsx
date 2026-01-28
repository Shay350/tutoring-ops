import AppShell, { type NavItem } from "@/components/app-shell";

const navItems: NavItem[] = [
  { label: "Today", href: "/tutor" },
  { label: "Schedule", href: "/tutor/schedule" },
  { label: "Students", href: "/tutor/students" },
  { label: "Messages", href: "/tutor/messages" },
];

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
