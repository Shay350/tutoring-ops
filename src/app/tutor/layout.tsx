import AppShell from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("tutor");

  return (
    <AppShell role="tutor" userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
