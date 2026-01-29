import AppShell, { type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems: NavItem[] = [
  { label: "Today", href: "/tutor" },
  { label: "Schedule", href: "/tutor/schedule" },
  { label: "Students", href: "/tutor/students" },
  { label: "Messages (Coming soon)", href: "/tutor/messages" },
];

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("tutor");

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
