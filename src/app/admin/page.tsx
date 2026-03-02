import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [profilesResult, invitesResult, locationsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("used", false),
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
  ]);

  const stats = [
    { label: "Profiles", value: profilesResult.count ?? 0 },
    { label: "Open invites", value: invitesResult.count ?? 0 },
    { label: "Active locations", value: locationsResult.count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold text-slate-900">Admin portal</h1>
        <p className="text-sm text-muted-foreground">
          Global administration surfaces live under /admin.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
