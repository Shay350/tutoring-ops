import AppShell from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("manager");

  return (
    <AppShell role="manager" userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
