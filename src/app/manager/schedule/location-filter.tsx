"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type LocationFilterProps = {
  locations: Array<{ id: string; name: string }>;
  selectedLocationId: string | null;
};

export default function LocationFilter({
  locations,
  selectedLocationId,
}: LocationFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={selectedLocationId ?? ""}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextLocationId = event.target.value;
        if (nextLocationId) {
          params.set("location", nextLocationId);
        } else {
          params.delete("location");
        }
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      data-testid="schedule-location-select"
    >
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </select>
  );
}
