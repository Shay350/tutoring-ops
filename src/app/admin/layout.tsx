import AppShell, { type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Pipeline", href: "/admin/pipeline" },
  { label: "Master Schedule", href: "/admin/schedule" },
  { label: "Students", href: "/admin/students" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Reports", href: "/admin/reports" },
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
