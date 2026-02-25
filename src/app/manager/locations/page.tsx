import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { createLocation, updateLocation } from "./actions";
import { CreateLocationForm, LocationRowForm } from "./location-forms";

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create location</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateLocationForm action={createLocation} />
        </CardContent>
      </Card>

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
                  <LocationRowForm
                    location={{
                      id: location.id,
                      name: location.name ?? "",
                      notes: location.notes,
                      active: location.active,
                    }}
                    action={updateLocation}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
