"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";

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
        status === "error" ? "text-xs text-red-600" : "text-xs text-emerald-600"
      }
      aria-live="polite"
      data-testid={status === "success" ? successTestId : undefined}
    >
      {message}
    </p>
  );
}

export default function AtRiskForm({
  studentId,
  isAtRisk,
  reason,
  action,
}: {
  studentId: string;
  isAtRisk: boolean;
  reason: string | null;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="student_id" value={studentId} />
      <div className="grid gap-2 md:grid-cols-[160px_1fr_auto] md:items-center">
        <div className="space-y-1">
          <Label htmlFor={`risk-${studentId}`} className="text-xs">
            Risk status
          </Label>
          <select
            id={`risk-${studentId}`}
            name="at_risk"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            defaultValue={isAtRisk ? "true" : "false"}
            data-testid={`risk-select-${studentId}`}
          >
            <option value="false">Not at-risk</option>
            <option value="true">At-risk</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`reason-${studentId}`} className="text-xs">
            Reason
          </Label>
          <Input
            id={`reason-${studentId}`}
            name="at_risk_reason"
            className="h-9"
            defaultValue={reason ?? ""}
            placeholder="Reason (optional)"
            data-testid={`risk-reason-${studentId}`}
          />
        </div>
        <Button type="submit" size="sm" data-testid={`risk-save-${studentId}`}>
          Save
        </Button>
      </div>
      <FormMessage
        message={state.message}
        status={state.status}
        successTestId={`risk-success-${studentId}`}
      />
    </form>
  );
}
