"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import { formatDate, formatTimeRange } from "@/lib/format";
import type { SchedulerSlot } from "@/lib/intake-scheduler";
import type { OperatingHoursRow } from "@/lib/operating-hours";
import { formatMinutesToTimeLabel } from "@/lib/schedule";

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

function OperatingHoursCollapsible({
  operatingHours,
  unavailableReason,
}: {
  operatingHours: OperatingHoursRow[];
  unavailableReason?: string;
}) {
  const openHours = operatingHours.filter((row) => !row.is_closed);

  return (
    <details
      className="rounded-md border border-border bg-slate-50 p-3"
      data-testid="operating-hours-collapsible"
    >
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Operating hours
      </summary>
      <div className="mt-3">
        {unavailableReason ? (
          <p className="text-sm text-muted-foreground">{unavailableReason}</p>
        ) : openHours.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Close</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openHours.map((row) => (
                <TableRow key={row.weekday}>
                  <TableCell className="font-medium">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                      row.weekday
                    ] ?? `Day ${row.weekday}`}
                  </TableCell>
                  <TableCell>{row.open_time?.slice(0, 5) ?? "—"}</TableCell>
                  <TableCell>{row.close_time?.slice(0, 5) ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No open operating-hour windows configured.
          </p>
        )}
      </div>
    </details>
  );
}

function ScheduleCalendarGrid({
  weekDates,
  slots,
  selectedSlotId,
  onSelectSlot,
}: {
  weekDates: string[];
  slots: SchedulerSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: SchedulerSlot) => void;
}) {
  const availabilityTone = (slot: SchedulerSlot | null) => {
    if (!slot || !slot.isOpenWindow || slot.openCount <= 0) {
      return {
        cell: "bg-slate-50 text-muted-foreground",
        badge: "border-slate-300 bg-slate-100 text-slate-700",
      };
    }

    if (slot.openCount >= 4) {
      return {
        cell: "bg-sky-200 text-sky-950",
        badge: "border-sky-400 bg-sky-300 text-sky-950",
      };
    }
    if (slot.openCount === 3) {
      return {
        cell: "bg-sky-100 text-sky-900",
        badge: "border-sky-300 bg-sky-200 text-sky-900",
      };
    }
    if (slot.openCount === 2) {
      return {
        cell: "bg-sky-50 text-sky-900",
        badge: "border-sky-200 bg-sky-100 text-sky-900",
      };
    }
    return {
      cell: "bg-blue-50 text-blue-900",
      badge: "border-blue-200 bg-blue-100 text-blue-900",
    };
  };

  const uniqueStartMinutes = Array.from(new Set(slots.map((slot) => slot.startMinutes))).sort(
    (a, b) => a - b
  );

  const slotsByDateAndMinute = slots.reduce<Record<string, Record<number, SchedulerSlot>>>(
    (acc, slot) => {
      if (!acc[slot.dateKey]) {
        acc[slot.dateKey] = {};
      }
      acc[slot.dateKey][slot.startMinutes] = slot;
      return acc;
    },
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule context for assignment</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div
          className="grid min-w-[960px]"
          style={{ gridTemplateColumns: `140px repeat(${weekDates.length}, minmax(0, 1fr))` }}
          data-testid="assign-scheduler-grid"
        >
          <div className="sticky left-0 z-10 border-b border-border bg-background p-3 text-sm font-medium text-slate-900">
            Time
          </div>
          {weekDates.map((dateKey) => (
            <div key={dateKey} className="border-b border-border bg-background p-3 text-sm font-medium text-slate-900">
              {formatDate(dateKey)}
            </div>
          ))}

          {uniqueStartMinutes.map((minute) => (
            <div key={minute} className="contents">
              <div className="sticky left-0 z-10 border-b border-border bg-background p-3 text-sm text-muted-foreground">
                {formatMinutesToTimeLabel(minute)}
              </div>
              {weekDates.map((dateKey) => {
                const slot = slotsByDateAndMinute[dateKey]?.[minute] ?? null;
                const isSelected = Boolean(slot && slot.slotId === selectedSlotId);
                const isSelectable = Boolean(slot?.isSelectable);
                const tone = availabilityTone(slot);
                const badgeText = slot
                  ? !slot.isOpenWindow
                    ? "Unavailable"
                    : slot.openCount > 0
                      ? `${slot.openCount} open`
                      : "Full"
                  : "Unavailable";

                return (
                  <button
                    key={`${dateKey}-${minute}`}
                    type="button"
                    disabled={!isSelectable}
                    onClick={() => {
                      if (slot && slot.isSelectable) {
                        onSelectSlot(slot);
                      }
                    }}
                    className={`min-h-[56px] border-b border-l border-border p-2 text-left ${
                      isSelected
                        ? `${tone.cell} ring-2 ring-sky-500 ring-inset`
                        : isSelectable
                          ? `${tone.cell} hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500`
                          : tone.cell
                    }`}
                    aria-pressed={isSelected}
                    aria-label={
                      slot
                        ? `${formatDate(dateKey)} ${formatTimeRange(
                            slot.startTime,
                            slot.endTime
                          )} ${badgeText}`
                        : `${formatDate(dateKey)} ${formatMinutesToTimeLabel(minute)} unavailable`
                    }
                    data-testid={isSelectable ? "assign-slot-cell-available" : "assign-slot-cell-disabled"}
                    data-slot-id={slot?.slotId ?? ""}
                    data-date-key={dateKey}
                  >
                    <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${tone.badge}`}>
                      {badgeText}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AssignSessionScheduler({
  intakeId,
  studentId,
  tutorId,
  weekDates,
  slots,
  operatingHours,
  operatingHoursUnavailableReason,
  defaultRepeatUntil,
  action,
}: {
  intakeId: string;
  studentId: string;
  tutorId: string;
  weekDates: string[];
  slots: SchedulerSlot[];
  operatingHours: OperatingHoursRow[];
  operatingHoursUnavailableReason?: string;
  defaultRepeatUntil: string;
  action: ActionHandler;
}) {
  const [state, formAction] = useFormState(action, initialActionState);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [repeatWeekly, setRepeatWeekly] = useState(true);

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.slotId === selectedSlotId) ?? null,
    [slots, selectedSlotId]
  );

  return (
    <div className="space-y-4" data-testid="intake-scheduler">
      <OperatingHoursCollapsible
        operatingHours={operatingHours}
        unavailableReason={operatingHoursUnavailableReason}
      />

      <ScheduleCalendarGrid
        weekDates={weekDates}
        slots={slots}
        selectedSlotId={selectedSlotId}
        onSelectSlot={(slot) => setSelectedSlotId(slot.slotId)}
      />

      {selectedSlot ? (
        <Card data-testid="assignment-panel">
          <CardHeader>
            <CardTitle>Assign session</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="student_id" value={studentId} />
              <input type="hidden" name="tutor_id" value={tutorId} />
              <input type="hidden" name="intake_id" value={intakeId} />
              <input type="hidden" name="status" value="scheduled" />
              <input
                type="hidden"
                name="session_block"
                value={`${selectedSlot.dateKey}|${selectedSlot.startTime}|${selectedSlot.endTime}`}
              />

              <p className="text-sm text-slate-700" data-testid="assignment-summary">
                {`${formatDate(selectedSlot.dateKey)} - ${formatTimeRange(
                  selectedSlot.startTime,
                  selectedSlot.endTime
                )} (${selectedSlot.openCount} open)`}
              </p>

              <div className="flex items-start gap-2 rounded-md border border-border bg-slate-50 p-3 text-sm">
                <input
                  id="allow_overbook"
                  name="allow_overbook"
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                />
                <div className="space-y-1">
                  <Label htmlFor="allow_overbook">Allow scheduling beyond prepaid hours</Label>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-border bg-slate-50 p-3 text-sm">
                <input
                  id="repeat_weekly"
                  name="repeat_weekly"
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={repeatWeekly}
                  onChange={(event) => setRepeatWeekly(event.currentTarget.checked)}
                  data-testid="repeat-weekly"
                />
                <div className="w-full space-y-2">
                  <Label htmlFor="repeat_weekly">Repeat weekly</Label>
                  <div className="space-y-1">
                    <Label htmlFor="repeat_until">Repeat until</Label>
                    <input
                      id="repeat_until"
                      name="repeat_until"
                      type="date"
                      defaultValue={defaultRepeatUntil}
                      disabled={!repeatWeekly}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:bg-slate-100"
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

              <Button type="submit" data-testid="session-submit" disabled={!selectedSlot}>
                Assign session
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
