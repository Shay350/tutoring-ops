"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";

import { createRecurringSessions } from "./actions";

type AssignmentOption = { value: string; label: string };

const weekdayOptions = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

function FormMessage({
  message,
  status,
  successTestId,
}: {
  message: string;
  status: string;
  successTestId?: string;
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
      data-testid={status === "success" ? successTestId : undefined}
    >
      {message}
    </p>
  );
}

export default function RecurringSessionForm({
  assignments,
  defaultStartDate,
  defaultEndDate,
}: {
  assignments: AssignmentOption[];
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const [state, formAction] = useFormState(
    createRecurringSessions,
    initialActionState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan recurring sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="assignment_pair">Assignment</Label>
            <select
              id="assignment_pair"
              name="assignment_pair"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              data-testid="recurring-assignment"
            >
              <option value="">Select a student + tutor</option>
              {assignments.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={defaultStartDate}
                required
                data-testid="recurring-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End date</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={defaultEndDate}
                required
                data-testid="recurring-end-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Start time</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                required
                data-testid="recurring-start-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End time</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                required
                data-testid="recurring-end-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="scheduled"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Weekdays</Label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
              {weekdayOptions.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={day.value}
                    className="h-4 w-4"
                    data-testid={`weekday-${day.value}`}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-border bg-slate-50 p-3 text-sm">
            <input
              id="allow_overbook"
              name="allow_overbook"
              type="checkbox"
              className="mt-1 h-4 w-4"
            />
            <div className="space-y-1">
              <Label htmlFor="allow_overbook">Allow scheduling beyond prepaid hours</Label>
              <p className="text-xs text-muted-foreground">
                If checked, you can create sessions even when upcoming sessions exceed membership hours remaining.
              </p>
            </div>
          </div>

          <FormMessage
            message={state.message}
            status={state.status}
            successTestId="recurring-success"
          />

          <Button type="submit" data-testid="recurring-submit">
            Create sessions
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
