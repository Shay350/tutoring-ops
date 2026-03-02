import AppShell, { type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems: NavItem[] = [{ label: "Dashboard", href: "/admin" }];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");

  return (
    <AppShell title="TutorOps" badge="Admin" homeHref="/admin" navItems={navItems}>
      {children}
    </AppShell>
  );
}
