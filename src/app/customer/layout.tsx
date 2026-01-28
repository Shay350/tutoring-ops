import AppShell from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("customer");

  return (
    <AppShell role="customer" userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
