"use client";

import { useMemo } from "react";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";
import type { OperatingHoursRow } from "@/lib/operating-hours";
import { weekdayLabels } from "@/lib/operating-hours";

import { updateOperatingHours } from "./schedule-settings-actions";

function FormMessage({
  message,
  status,
}: {
  message: string;
  status: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={
        status === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600"
      }
      aria-live="polite"
    >
      {message}
    </p>
  );
}

export default function OperatingHoursForm({
  hours,
  disabledReason,
}: {
  hours: OperatingHoursRow[];
  disabledReason?: string;
}) {
  const [state, formAction] = useFormState(
    updateOperatingHours,
    initialActionState
  );

  const ordered = useMemo(
    () => [...hours].sort((a, b) => a.weekday - b.weekday),
    [hours]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operating hours</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {disabledReason ? (
          <p className="text-sm text-muted-foreground">{disabledReason}</p>
        ) : null}

        <form action={formAction} className="space-y-4">
          <div className="space-y-3">
            {ordered.map((row) => {
              const prefix = `weekday_${row.weekday}`;
              return (
                <div
                  key={row.weekday}
                  className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-12 md:items-center"
                >
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-slate-900">
                      {weekdayLabels[row.weekday] ?? `Day ${row.weekday}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:col-span-3">
                    <input
                      type="checkbox"
                      id={`${prefix}_closed`}
                      name={`${prefix}_closed`}
                      defaultChecked={row.is_closed}
                      className="h-4 w-4"
                      disabled={Boolean(disabledReason)}
                    />
                    <Label htmlFor={`${prefix}_closed`}>Closed</Label>
                  </div>

                  <div className="space-y-1 md:col-span-3">
                    <Label htmlFor={`${prefix}_open`}>Open</Label>
                    <Input
                      id={`${prefix}_open`}
                      name={`${prefix}_open`}
                      type="time"
                      defaultValue={(row.open_time ?? "09:00").slice(0, 5)}
                      disabled={Boolean(disabledReason)}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-3">
                    <Label htmlFor={`${prefix}_close`}>Close</Label>
                    <Input
                      id={`${prefix}_close`}
                      name={`${prefix}_close`}
                      type="time"
                      defaultValue={(row.close_time ?? "17:00").slice(0, 5)}
                      disabled={Boolean(disabledReason)}
                    />
                  </div>

                  <input
                    type="hidden"
                    name="weekdays"
                    value={String(row.weekday)}
                  />
                </div>
              );
            })}
          </div>

          <FormMessage message={state.message} status={state.status} />

          <Button type="submit" disabled={Boolean(disabledReason)}>
            Save hours
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
