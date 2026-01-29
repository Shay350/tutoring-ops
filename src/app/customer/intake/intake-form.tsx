"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";

import { submitIntake } from "./actions";

export default function IntakeForm() {
  const [state, formAction] = useFormState(submitIntake, initialActionState);

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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="Seattle, WA"
              required
              data-testid="intake-location"
            />
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
            <Button type="submit" data-testid="intake-submit">
              Submit intake
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
