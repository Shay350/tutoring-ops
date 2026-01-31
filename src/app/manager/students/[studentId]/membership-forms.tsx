"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import { formatHours } from "@/lib/format";

type ActionHandler = (
  prevState: ActionState,
  formData: FormData
) => Promise<ActionState>;

type Membership = {
  id: string;
  plan_type: string | null;
  status: string | null;
  hours_total: number | null;
  hours_remaining: number | null;
  renewal_date: string | null;
  notes: string | null;
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

export function MembershipForm({
  studentId,
  membership,
  action,
}: {
  studentId: string;
  membership: Membership | null;
  action: ActionHandler;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="grid gap-4"
          data-testid="membership-form"
        >
          <input type="hidden" name="student_id" value={studentId} />
          {membership?.id ? (
            <input type="hidden" name="membership_id" value={membership.id} />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan_type">Plan type</Label>
              <Input
                id="plan_type"
                name="plan_type"
                defaultValue={membership?.plan_type ?? ""}
                placeholder="Standard, Intensive, etc."
                required
                data-testid="membership-plan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={membership?.status ?? "active"}
                data-testid="membership-status"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
                <option value="trial">Trial</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_total">Total hours</Label>
              <Input
                id="hours_total"
                name="hours_total"
                type="number"
                min="0"
                step="0.5"
                defaultValue={
                  membership?.hours_total !== null &&
                  membership?.hours_total !== undefined
                    ? String(membership.hours_total)
                    : ""
                }
                required
                data-testid="membership-hours-total"
              />
            </div>
            {membership ? (
              <div className="space-y-2">
                <Label>Hours remaining</Label>
                <div
                  className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  data-testid="membership-hours-remaining"
                >
                  {formatHours(membership.hours_remaining)} hrs
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="hours_remaining">Starting hours remaining</Label>
                <Input
                  id="hours_remaining"
                  name="hours_remaining"
                  type="number"
                  min="0"
                  step="0.5"
                  defaultValue=""
                  required
                  data-testid="membership-hours-remaining-input"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="renewal_date">Renewal date</Label>
              <Input
                id="renewal_date"
                name="renewal_date"
                type="date"
                defaultValue={membership?.renewal_date ?? ""}
                data-testid="membership-renewal"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={membership?.notes ?? ""}
              data-testid="membership-notes"
            />
          </div>
          <FormMessage
            message={state.message}
            status={state.status}
            successTestId="membership-saved"
          />
          <Button type="submit" data-testid="membership-save">
            {membership ? "Update membership" : "Create membership"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function MembershipAdjustmentForm({
  membershipId,
  studentId,
  action,
}: {
  membershipId: string;
  studentId: string;
  action: ActionHandler;
}) {
  const [state, formAction] = useFormState(action, initialActionState);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const openDialog = () => {
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjust hours</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Adjust remaining hours with a reason for the audit trail.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={openDialog}
          data-testid="membership-adjust-open"
        >
          Adjust hours
        </Button>
        <dialog
          ref={dialogRef}
          className="w-full max-w-lg rounded-lg border border-border bg-white p-0 shadow-lg"
          data-testid="membership-adjust-dialog"
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Adjust hours
            </h2>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-slate-900"
              onClick={closeDialog}
              data-testid="membership-adjust-close"
            >
              Close
            </button>
          </div>
          <form
            action={formAction}
            className="grid gap-4 px-6 py-4"
            data-testid="membership-adjust-form"
          >
            <input type="hidden" name="membership_id" value={membershipId} />
            <input type="hidden" name="student_id" value={studentId} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delta_hours">Delta hours</Label>
                <Input
                  id="delta_hours"
                  name="delta_hours"
                  type="number"
                  step="0.5"
                  required
                  placeholder="-1 or +2"
                  data-testid="membership-adjust-delta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  name="reason"
                  required
                  placeholder="Reason for adjustment"
                  data-testid="membership-adjust-reason"
                />
              </div>
            </div>
            <FormMessage
              message={state.message}
              status={state.status}
              successTestId="membership-adjusted"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="membership-adjust-submit">
                Apply adjustment
              </Button>
            </div>
          </form>
        </dialog>
      </CardContent>
    </Card>
  );
}
