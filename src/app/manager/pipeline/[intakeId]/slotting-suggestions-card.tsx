"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import { formatDate, formatTimeRange } from "@/lib/format";
import { formatSlottingReasons } from "@/lib/slotting-reasons";

type ActionHandler = (
  prevState: ActionState,
  formData: FormData
) => Promise<ActionState>;

export type SlottingSuggestionView = {
  id: string;
  rank: number;
  tutorName: string;
  tutorId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  score: number;
  status: string;
  reasons: unknown;
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

function SlottingSuggestionRow({
  intakeId,
  suggestion,
  disableApprove,
  approveAction,
  rejectAction,
}: {
  intakeId: string;
  suggestion: SlottingSuggestionView;
  disableApprove: boolean;
  approveAction: ActionHandler;
  rejectAction: ActionHandler;
}) {
  const [approveState, approveFormAction] = useFormState(
    approveAction,
    initialActionState
  );
  const [rejectState, rejectFormAction] = useFormState(
    rejectAction,
    initialActionState
  );

  const formatted = formatSlottingReasons(suggestion.reasons);
  const isTerminal = suggestion.status !== "new";

  return (
    <div
      className="rounded-md border border-border p-3"
      data-testid="slotting-suggestion-row"
      data-suggestion-id={suggestion.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="text-sm font-medium text-slate-900">
            #{suggestion.rank} · {formatDate(suggestion.sessionDate)} ·{" "}
            {formatTimeRange(suggestion.startTime, suggestion.endTime)}
          </div>
          <div className="text-xs text-muted-foreground">
            Tutor: {suggestion.tutorName} · Score: {suggestion.score} · Status:{" "}
            {suggestion.status}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={approveFormAction}>
            <input type="hidden" name="intake_id" value={intakeId} />
            <input type="hidden" name="suggestion_id" value={suggestion.id} />
            <Button
              type="submit"
              size="sm"
              data-testid="slotting-approve"
              disabled={isTerminal || disableApprove}
              title={
                disableApprove
                  ? "Approve intake first to create a student record."
                  : undefined
              }
            >
              Approve
            </Button>
          </form>
          <form action={rejectFormAction}>
            <input type="hidden" name="intake_id" value={intakeId} />
            <input type="hidden" name="suggestion_id" value={suggestion.id} />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              data-testid="slotting-reject"
              disabled={isTerminal}
            >
              Reject
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-2 text-sm text-muted-foreground" data-testid="slotting-why">
        {formatted.summary ? (
          <div className="font-medium text-slate-700">{formatted.summary}</div>
        ) : null}
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {formatted.lines.slice(0, 6).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {formatted.lines.length > 6 ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-sky-700">
              Show all reasons
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {formatted.lines.slice(6).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className="mt-2 grid gap-1">
        <FormMessage
          message={approveState.message}
          status={approveState.status}
          successTestId="slotting-approved"
        />
        <FormMessage
          message={rejectState.message}
          status={rejectState.status}
          successTestId="slotting-rejected"
        />
      </div>
    </div>
  );
}

export default function SlottingSuggestionsCard({
  intakeId,
  suggestions,
  disableApprove,
  approveAction,
  rejectAction,
}: {
  intakeId: string;
  suggestions: SlottingSuggestionView[];
  disableApprove: boolean;
  approveAction: ActionHandler;
  rejectAction: ActionHandler;
}) {
  return (
    <Card data-testid="slotting-suggestions-list">
      <CardHeader>
        <CardTitle>Slotting suggestions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ranked suggestions generated after intake submission. Review the
          explanation before approving.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <SlottingSuggestionRow
              key={suggestion.id}
              intakeId={intakeId}
              suggestion={suggestion}
              disableApprove={disableApprove}
              approveAction={approveAction}
              rejectAction={rejectAction}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No slotting suggestions yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

