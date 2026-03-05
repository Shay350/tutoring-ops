import AppShell, { type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", testId: "admin-nav-dashboard" },
  { label: "Invites", href: "/admin/invites", testId: "admin-nav-invites" },
  { label: "Locations", href: "/admin/locations", testId: "admin-nav-locations" },
  { label: "Access", href: "/admin/access", testId: "admin-nav-access" },
];

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
