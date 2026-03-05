import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type LocationRow = {
  id: string;
  name: string | null;
  notes: string | null;
  active: boolean | null;
};

export default async function ManagerLocationsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, notes, active")
    .order("name", { ascending: true });

  const locations = (data ?? []) as LocationRow[];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Manager</p>
        <h1 className="text-2xl font-semibold text-slate-900">Locations</h1>
        <p className="text-sm text-muted-foreground" data-testid="manager-locations-boundary">
          Locations are read-only in manager mode. Create or edit locations in admin governance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location list</CardTitle>
        </CardHeader>
        <CardContent data-testid="locations-list">
          {error ? (
            <p className="text-sm text-muted-foreground">
              Locations are unavailable for this account right now.
            </p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No locations are visible to your account yet.
            </p>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="rounded-md border p-4"
                  data-testid="location-row"
                  data-location-id={location.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-slate-900">{location.name ?? "Unnamed location"}</h3>
                    <Badge variant={location.active ? "outline" : "secondary"}>
                      {location.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {location.notes?.trim() ? location.notes : "No notes."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
