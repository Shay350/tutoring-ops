"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import type { LocationOption } from "@/lib/locations";

type IntakeFormProps = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  locations: LocationOption[];
};

export default function IntakeForm({ action, locations }: IntakeFormProps) {
  const [state, formAction] = useFormState(action, initialActionState);
  const hasLocations = locations.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit an intake</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student_name">Student name</Label>
              <Input
                id="student_name"
                name="student_name"
                placeholder="Jordan Smith"
                required
                data-testid="intake-student-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_grade">Grade</Label>
              <Input
                id="student_grade"
                name="student_grade"
                placeholder="8th"
                required
                data-testid="intake-student-grade"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subjects">Subjects</Label>
            <Input
              id="subjects"
              name="subjects"
              placeholder="Math, Reading, Science"
              required
              data-testid="intake-subjects"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple subjects with commas.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="availability">Availability</Label>
            <textarea
              id="availability"
              name="availability"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Weekdays after 4 PM, Saturdays mornings"
              required
              data-testid="intake-availability"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goals">Goals</Label>
            <textarea
              id="goals"
              name="goals"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Improve algebra fundamentals before spring tests"
              required
              data-testid="intake-goals"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location_id">Location</Label>
            <select
              id="location_id"
              name="location_id"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              disabled={!hasLocations}
              data-testid="intake-location-select"
            >
              {hasLocations ? (
                <>
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value="">No active locations available</option>
              )}
            </select>
            {!hasLocations ? (
              <p
                className="text-xs text-amber-700"
                data-testid="intake-location-unavailable"
              >
                Intake submissions are temporarily unavailable. Please contact your
                manager to activate a location.
              </p>
            ) : null}
          </div>
          {state.status !== "idle" ? (
            <p
              className={
                state.status === "error"
                  ? "text-sm text-red-600"
                  : "text-sm text-emerald-600"
              }
              aria-live="polite"
              data-testid={state.status === "success" ? "intake-success" : undefined}
            >
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" data-testid="intake-submit" disabled={!hasLocations}>
              Submit intake
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
