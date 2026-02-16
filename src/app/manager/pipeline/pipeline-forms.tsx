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

export function CreateSessionForm({
  intakeId,
  studentId,
  tutorId,
  availableSessionBlocks,
  defaultRepeatUntil,
  action,
}: {
  intakeId: string;
  studentId: string;
  tutorId: string;
  availableSessionBlocks: Array<{ value: string; label: string }>;
  defaultRepeatUntil: string;
  action: ActionHandler;
}) {
  const [state, formAction] = useFormState(action, initialActionState);
  const hasAvailableBlocks = availableSessionBlocks.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign session</CardTitle>
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
          <input type="hidden" name="status" value="scheduled" />
          <div className="space-y-2">
            <Label htmlFor="session_block">Available blocks</Label>
            <select
              id="session_block"
              name="session_block"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              data-testid="session-block-select"
              disabled={!hasAvailableBlocks}
            >
              <option value="">
                {hasAvailableBlocks
                  ? "Select an available session block"
                  : "No available blocks in the next 2 weeks"}
              </option>
              {availableSessionBlocks.map((block) => (
                <option key={block.value} value={block.value}>
                  {block.label}
                </option>
              ))}
            </select>
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
                If checked, you can assign this block even when upcoming sessions exceed membership hours remaining.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-border bg-slate-50 p-3 text-sm">
            <input
              id="repeat_weekly"
              name="repeat_weekly"
              type="checkbox"
              className="mt-1 h-4 w-4"
              defaultChecked
              data-testid="repeat-weekly"
            />
            <div className="w-full space-y-2">
              <Label htmlFor="repeat_weekly">Repeat weekly</Label>
              <p className="text-xs text-muted-foreground">
                Checked by default. Uncheck for a one-time assignment.
              </p>
              <div className="space-y-1">
                <Label htmlFor="repeat_until">Repeat until</Label>
                <input
                  id="repeat_until"
                  name="repeat_until"
                  type="date"
                  defaultValue={defaultRepeatUntil}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  data-testid="repeat-until"
                />
              </div>
            </div>
          </div>

          <FormMessage
            message={state.message}
            status={state.status}
            successTestId="session-created"
          />
          <Button
            type="submit"
            data-testid="session-submit"
            disabled={!hasAvailableBlocks}
          >
            Assign session
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
