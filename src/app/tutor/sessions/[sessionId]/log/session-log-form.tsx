"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";

type SessionLogDefaults = {
  topics: string | null;
  homework: string | null;
  next_plan: string | null;
  customer_summary: string | null;
  private_notes: string | null;
  attendance_rate?: number | null;
  homework_completion?: number | null;
  progress_notes?: string | null;
};

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

export default function SessionLogForm({
  sessionId,
  defaults,
  action,
}: {
  sessionId: string;
  defaults: SessionLogDefaults;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session log</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="session_id" value={sessionId} />
          <div className="space-y-2">
            <Label htmlFor="topics">Topics covered</Label>
            <textarea
              id="topics"
              name="topics"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Fractions, word problems, study strategies"
              defaultValue={defaults.topics ?? ""}
              required
              data-testid="session-log-topics"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="homework">Homework / practice</Label>
            <textarea
              id="homework"
              name="homework"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Complete worksheet 4A, read chapter 3"
              defaultValue={defaults.homework ?? ""}
              data-testid="session-log-homework"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_plan">Next session plan</Label>
            <textarea
              id="next_plan"
              name="next_plan"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Review homework, introduce decimals"
              defaultValue={defaults.next_plan ?? ""}
              data-testid="session-log-next-plan"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="attendance_rate">Attendance rate (%)</Label>
              <input
                id="attendance_rate"
                name="attendance_rate"
                type="number"
                min={0}
                max={100}
                step={1}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={defaults.attendance_rate ?? ""}
                data-testid="session-log-attendance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homework_completion">Homework completion (%)</Label>
              <input
                id="homework_completion"
                name="homework_completion"
                type="number"
                min={0}
                max={100}
                step={1}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={defaults.homework_completion ?? ""}
                data-testid="session-log-homework-completion"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="progress_notes">Progress notes</Label>
            <textarea
              id="progress_notes"
              name="progress_notes"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Notes about momentum, challenges, or wins"
              defaultValue={defaults.progress_notes ?? ""}
              data-testid="session-log-progress-notes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_summary">Customer-visible summary</Label>
            <textarea
              id="customer_summary"
              name="customer_summary"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="We focused on... Next time we will..."
              defaultValue={defaults.customer_summary ?? ""}
              required
              data-testid="session-log-summary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="private_notes">Private notes (internal)</Label>
            <p className="text-xs text-muted-foreground">
              Visible to managers and tutors only.
            </p>
            <textarea
              id="private_notes"
              name="private_notes"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Internal observations"
              defaultValue={defaults.private_notes ?? ""}
              data-testid="session-log-private-notes"
            />
          </div>
          <FormMessage
            message={state.message}
            status={state.status}
            successTestId="session-log-saved"
          />
          <div className="flex justify-end">
            <Button type="submit" data-testid="session-log-submit">
              Save session log
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
