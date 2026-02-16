"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";

type ActionHandler = (
  prevState: ActionState,
  formData: FormData
) => Promise<ActionState>;

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

export function ApproveIntakeForm({
  intakeId,
  action,
}: {
  intakeId: string;
  action: ActionHandler;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approve intake</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="intake_id" value={intakeId} />
          <p className="text-sm text-muted-foreground">
            Approving this intake will create a student record.
          </p>
          <FormMessage
            message={state.message}
            status={state.status}
            successTestId="intake-approved"
          />
          <Button type="submit" data-testid="intake-approve">
            Approve and create student
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

type TutorOption = { id: string; full_name: string | null };

export function AssignTutorForm({
  intakeId,
  studentId,
  tutors,
  action,
}: {
  intakeId: string;
  studentId: string;
  tutors: TutorOption[];
  action: ActionHandler;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign a tutor</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="grid gap-4"
          data-testid="assign-tutor"
        >
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="intake_id" value={intakeId} />
          <div className="space-y-2">
            <Label htmlFor="tutor_id">Tutor</Label>
            <select
              id="tutor_id"
              name="tutor_id"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              data-testid="assign-tutor-select"
            >
              <option value="">Select a tutor</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.full_name ?? "Tutor"}
                </option>
              ))}
            </select>
          </div>
          <FormMessage
            message={state.message}
            status={state.status}
            successTestId="assign-success"
          />
          <Button type="submit" data-testid="assign-submit">
            Assign tutor
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
