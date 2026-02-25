"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";

type LocationFormAction = (
  prevState: ActionState,
  formData: FormData
) => Promise<ActionState>;

type LocationRow = {
  id: string;
  name: string;
  notes: string | null;
  active: boolean | null;
};

function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.status === "error" ? "text-xs text-red-600" : "text-xs text-emerald-600"
      }
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

export function CreateLocationForm({
  action,
}: {
  action: LocationFormAction;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-md border p-4"
      data-testid="location-create"
    >
      <div className="grid gap-2">
        <Label htmlFor="create-location-name">Name</Label>
        <Input
          id="create-location-name"
          name="name"
          required
          placeholder="Downtown"
          data-testid="location-name"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="create-location-notes">Notes</Label>
        <Input
          id="create-location-notes"
          name="notes"
          placeholder="Optional notes"
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked
          data-testid="location-active"
        />
        Active
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" data-testid="location-save">
          Create location
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function LocationRowForm({
  location,
  action,
}: {
  location: LocationRow;
  action: LocationFormAction;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="location_id" value={location.id} />
      <div className="grid gap-2 md:grid-cols-[1.2fr_1.6fr_auto_auto] md:items-end">
        <div className="grid gap-1">
          <Label htmlFor={`location-name-${location.id}`}>Name</Label>
          <Input
            id={`location-name-${location.id}`}
            name="name"
            required
            defaultValue={location.name}
            data-testid="location-name"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`location-notes-${location.id}`}>Notes</Label>
          <Input
            id={`location-notes-${location.id}`}
            name="notes"
            defaultValue={location.notes ?? ""}
            placeholder="Optional notes"
          />
        </div>
        <label className="inline-flex h-10 items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={Boolean(location.active)}
            data-testid="location-active"
          />
          Active
        </label>
        <Button type="submit" className="w-fit" data-testid="location-save">
          Save
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
