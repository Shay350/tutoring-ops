"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export function CreateSessionForm({
  intakeId,
  studentId,
  tutorId,
  action,
}: {
  intakeId: string;
  studentId: string;
  tutorId: string;
  action: ActionHandler;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create session</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="grid gap-4"
          data-testid="create-session"
        >
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="tutor_id" value={tutorId} />
          <input type="hidden" name="intake_id" value={intakeId} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session_date">Session date</Label>
              <Input
                id="session_date"
                name="session_date"
                type="date"
                required
                data-testid="session-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Start time</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                required
                data-testid="session-start-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End time</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                required
                data-testid="session-end-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="scheduled"
                data-testid="create-session-status"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
          <FormMessage
            message={state.message}
            status={state.status}
            successTestId="session-created"
          />
          <Button type="submit" data-testid="session-submit">
            Create session
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
