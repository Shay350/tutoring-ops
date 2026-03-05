import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLocationsPage() {
  const supabase = await createClient();

  const [{ data: locations }, { data: memberships }] = await Promise.all([
    supabase.from("locations").select("id, name, active").order("name", { ascending: true }),
    supabase
      .from("profile_locations")
      .select("location_id, profiles(id, full_name, email, role)")
      .order("created_at", { ascending: false }),
  ]);

  const membersByLocation = new Map<string, string[]>();

  for (const row of memberships ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile) continue;

    const label = `${profile.full_name ?? profile.email ?? profile.id} (${profile.role})`;
    const existing = membersByLocation.get(row.location_id) ?? [];
    existing.push(label);
    membersByLocation.set(row.location_id, existing);
  }

  return (
    <div className="space-y-6" data-testid="admin-locations-page">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Location governance</h1>
        <p className="text-sm text-muted-foreground">
          Review global locations and who currently has location memberships.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations && locations.length > 0 ? (
                locations.map((location) => {
                  const members = membersByLocation.get(location.id) ?? [];

                  return (
                    <TableRow key={location.id} data-testid={`admin-location-row-${location.id}`}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.active ? "Active" : "Inactive"}</TableCell>
                      <TableCell>
                        {members.length > 0 ? members.join(", ") : "No memberships"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm">No locations found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
