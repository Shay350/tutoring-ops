import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initialActionState } from "@/lib/action-state";
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/format";
import { deriveShortCodeCandidates, isUuid } from "@/lib/ids";
import { getDefaultLocationId, getLocationIdForIntake } from "@/lib/locations";
import {
  buildSchedulerSlots,
} from "@/lib/intake-scheduler";
import {
  mapOperatingHoursByWeekday,
  operatingHoursWindowMinutes,
  type OperatingHoursRow,
  normalizeOperatingHours,
} from "@/lib/operating-hours";
import {
  addDaysUtc,
  formatDateKey,
  getWeekDates,
  getWeekStart,
  parseTimeToMinutes,
  timeRangesOverlap,
} from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import {
  approveIntake,
  assignTutor,
  completeSession,
  createSession,
} from "../actions";
import {
  ApproveIntakeForm,
  AssignTutorForm,
} from "../pipeline-forms";
import AssignSessionScheduler from "../assign-session-scheduler";
import {
  approveSlottingSuggestion,
  rejectSlottingSuggestion,
} from "../../slotting/actions";
import SlottingSuggestionsCard, {
  type SlottingSuggestionView,
} from "./slotting-suggestions-card";

type PageProps = {
  params: { intakeId: string } | Promise<{ intakeId: string }>;
};
const MAX_STUDENTS_PER_TUTOR_PER_HOUR = 4;

async function handleCompleteSession(formData: FormData) {
  "use server";
  await completeSession(initialActionState, formData);
}

export default async function IntakeDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const supabase = await createClient();
  const intakeId = resolvedParams.intakeId;
  const isIntakeUuid = isUuid(intakeId);
  const intakeLookup = supabase
    .from("intakes")
    .select(
      "id, customer_id, status, student_name, student_grade, subjects, availability, goals, location, location_id, created_at, locations(name)"
    );

  const intakeLookupRaw = String(intakeId ?? "").trim();
  const intakeShortCodeCandidates = isIntakeUuid
    ? []
    : deriveShortCodeCandidates(intakeLookupRaw);

  const intakeResult = isIntakeUuid
    ? await intakeLookup.eq("id", intakeLookupRaw).maybeSingle()
    : intakeShortCodeCandidates.length === 1
      ? await intakeLookup
          .eq("short_code", intakeShortCodeCandidates[0])
          .maybeSingle()
      : await intakeLookup
          .in("short_code", intakeShortCodeCandidates)
          .maybeSingle();

  const intake = intakeResult.data ?? null;

  if (!intake) {
    notFound();
  }

  let contextLocationId: string | null = null;
  try {
    contextLocationId = await getLocationIdForIntake(supabase, intake.id);
  } catch {
    try {
      contextLocationId = await getDefaultLocationId(supabase);
    } catch {
      contextLocationId = null;
    }
  }

  const intakeLocationRow = Array.isArray(intake.locations)
    ? intake.locations[0]
    : intake.locations;
  const intakeLocationName = intakeLocationRow?.name ?? intake.location ?? "—";

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, status, created_at")
    .eq("intake_id", intake.id)
    .maybeSingle();

  const [tutorsResult, operatingHoursResult, slottingSuggestionsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "tutor")
        .order("full_name", { ascending: true }),
      supabase
        .from("operating_hours")
        .select("weekday, is_closed, open_time, close_time")
        .match(contextLocationId ? { location_id: contextLocationId } : {})
        .order("weekday", { ascending: true }),
      supabase
        .from("slotting_suggestions")
        .select(
          "id, tutor_id, session_date, start_time, end_time, score, reasons, status, created_at"
        )
        .eq("intake_id", intake.id)
        .order("score", { ascending: false })
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  const slottingSuggestions = slottingSuggestionsResult.data ?? [];
  const slottingSuggestionsError = slottingSuggestionsResult.error;

  let assignment:
    | { id: string; tutor_id: string | null; status: string | null }
    | null = null;
  let sessions: Array<{
    id: string;
    session_date: string | null;
    start_time: string | null;
    end_time: string | null;
    status: string | null;
    billed_to_membership: boolean | null;
  }> = [];
  const tutors = tutorsResult.data ?? [];
  const tutorNamesById = tutors.reduce<Record<string, string>>((acc, row) => {
    acc[row.id] = row.full_name?.trim() || "Tutor";
    return acc;
  }, {});

  const slottingSuggestionsView: SlottingSuggestionView[] = slottingSuggestions.map(
    (suggestion, index) => ({
      id: suggestion.id,
      rank: index + 1,
      tutorName:
        tutorNamesById[suggestion.tutor_id] ??
        (suggestion.tutor_id ? "Tutor" : "—"),
      tutorId: suggestion.tutor_id,
      sessionDate: suggestion.session_date ?? "",
      startTime: suggestion.start_time ?? "",
      endTime: suggestion.end_time ?? "",
      score: suggestion.score ?? 0,
      status: suggestion.status ?? "new",
      reasons: suggestion.reasons,
    })
  );

  if (student) {
    const [assignmentResult, sessionsResult] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, tutor_id, status")
        .eq("student_id", student.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("sessions")
        .select(
          "id, session_date, start_time, end_time, status, billed_to_membership"
        )
        .eq("student_id", student.id)
        .order("session_date", { ascending: false }),
    ]);

    assignment = assignmentResult.data ?? null;
    sessions = sessionsResult.data ?? [];
  }

  const weekStart = getWeekStart(new Date());
  const weekDates = getWeekDates(weekStart);

  const { data: scheduleSessions } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, status, tutor_id, students(id, full_name)"
    )
    .eq("status", "scheduled")
    .match(contextLocationId ? { location_id: contextLocationId } : {})
    .gte("session_date", weekDates[0])
    .lte("session_date", weekDates[6])
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const scheduleSessionRows = scheduleSessions ?? [];

  const operatingHours = normalizeOperatingHours(
    (operatingHoursResult.data ?? []) as OperatingHoursRow[]
  );
  const operatingHoursByWeekday = mapOperatingHoursByWeekday(operatingHours);

  const availableSlotIdSet = new Set<string>();
  const defaultRepeatUntil = formatDateKey(addDaysUtc(new Date(), 56));

  if (student && assignment?.tutor_id) {
    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const windowStart = formatDateKey(todayUtc);
    const windowEnd = formatDateKey(addDaysUtc(todayUtc, 13));

    const { data: tutorSessionRows } = await supabase
      .from("sessions")
      .select("session_date, start_time, end_time, status")
      .eq("tutor_id", assignment.tutor_id)
      .neq("status", "canceled")
      .gte("session_date", windowStart)
      .lte("session_date", windowEnd);

    const sessionsByDateForTutor = (tutorSessionRows ?? []).reduce<
      Record<string, Array<{ startMinutes: number; endMinutes: number }>>
    >((acc, session) => {
      if (!session.session_date || !session.start_time || !session.end_time) {
        return acc;
      }

      const startMinutes = parseTimeToMinutes(session.start_time);
      const endMinutes = parseTimeToMinutes(session.end_time);
      if (startMinutes === null || endMinutes === null) {
        return acc;
      }

      if (!acc[session.session_date]) {
        acc[session.session_date] = [];
      }
      acc[session.session_date].push({ startMinutes, endMinutes });
      return acc;
    }, {});

    const toTimeInput = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };
    for (let offset = 0; offset < 14; offset += 1) {
      const date = addDaysUtc(todayUtc, offset);
      const dateKey = formatDateKey(date);
      const weekday = date.getUTCDay();
      const dayHours = operatingHoursByWeekday[weekday];
      const { openMinutes, closeMinutes } = dayHours
        ? operatingHoursWindowMinutes(dayHours)
        : { openMinutes: null, closeMinutes: null };

      if (openMinutes === null || closeMinutes === null) {
        continue;
      }

      const existingRanges = sessionsByDateForTutor[dateKey] ?? [];

      for (let start = openMinutes; start + 60 <= closeMinutes; start += 60) {
        const end = start + 60;
        const overlappingCount = existingRanges.filter((range) =>
          timeRangesOverlap(start, end, range.startMinutes, range.endMinutes)
        ).length;
        if (overlappingCount >= MAX_STUDENTS_PER_TUTOR_PER_HOUR) {
          continue;
        }

        const startTime = toTimeInput(start);
        const endTime = toTimeInput(end);
        availableSlotIdSet.add(`${dateKey}|${startTime}|${endTime}`);
      }
    }
  }

  const slotsByDateAndRange = scheduleSessionRows.reduce<
    Record<string, Array<{ startMinutes: number; endMinutes: number }>>
  >((acc, session) => {
    if (!session.session_date || !session.start_time || !session.end_time) {
      return acc;
    }
    const startMinutes = parseTimeToMinutes(session.start_time);
    const endMinutes = parseTimeToMinutes(session.end_time);
    if (startMinutes === null || endMinutes === null) {
      return acc;
    }
    if (!acc[session.session_date]) {
      acc[session.session_date] = [];
    }
    acc[session.session_date].push({ startMinutes, endMinutes });
    return acc;
  }, {});

  const hoursWindows = weekDates.map((dateKey) => {
    const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
    const dayHours = operatingHoursByWeekday[weekday];
    const window = dayHours
      ? operatingHoursWindowMinutes(dayHours)
      : { openMinutes: null, closeMinutes: null };
    return { dateKey, ...window };
  });
  const openMinutesAll = hoursWindows
    .map((window) => window.openMinutes)
    .filter((value): value is number => value !== null);
  const closeMinutesAll = hoursWindows
    .map((window) => window.closeMinutes)
    .filter((value): value is number => value !== null);
  const gridStartMinutes = openMinutesAll.length ? Math.min(...openMinutesAll) : 9 * 60;
  const gridEndMinutes = closeMinutesAll.length ? Math.max(...closeMinutesAll) : 17 * 60;

  const capacityPerSlot = MAX_STUDENTS_PER_TUTOR_PER_HOUR;
  const openWindowByDate = weekDates.reduce<
    Record<string, { openMinutes: number | null; closeMinutes: number | null }>
  >((acc, dateKey) => {
    const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
    const dayHours = operatingHoursByWeekday[weekday];
    acc[dateKey] = dayHours
      ? operatingHoursWindowMinutes(dayHours)
      : { openMinutes: null, closeMinutes: null };
    return acc;
  }, {});

  const schedulerSlots = buildSchedulerSlots({
    weekDates,
    gridStartMinutes,
    gridEndMinutes,
    openWindowByDate,
    busyRangesByDate: slotsByDateAndRange,
    capacityPerSlot,
    availableSlotIdSet,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Manager</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Intake review
          </h1>
        </div>
        <Link
          href="/manager/pipeline"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to pipeline
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Intake details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">
              {intake.student_name}
            </span>
            <Badge variant="secondary" className="capitalize">
              {intake.status ?? "submitted"}
            </Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Grade</p>
              <p>{intake.student_grade ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p>{formatDateTime(intake.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subjects</p>
              <p>
                {Array.isArray(intake.subjects)
                  ? intake.subjects.join(", ")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p>{intakeLocationName}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Availability</p>
            <p className="text-sm text-slate-700">{intake.availability}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Goals</p>
            <p className="text-sm text-slate-700">{intake.goals}</p>
          </div>
        </CardContent>
      </Card>

      {slottingSuggestionsError ? (
        <Card data-testid="slotting-suggestions-list">
          <CardHeader>
            <CardTitle>Slotting suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Slotting suggestions are unavailable. Apply the VS9 suggestions
              migration to enable this view.
            </p>
          </CardContent>
        </Card>
      ) : (
        <SlottingSuggestionsCard
          intakeId={intake.id}
          suggestions={slottingSuggestionsView}
          disableApprove={!student}
          approveAction={approveSlottingSuggestion}
          rejectAction={rejectSlottingSuggestion}
        />
      )}

      <Card data-testid="intake-schedule-context">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Schedule context for assignment</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Review this week&apos;s active schedule and operating hours before
              assigning a tutor block.
            </p>
          </div>
          <Link
            href={`/manager/schedule${contextLocationId ? `?location=${contextLocationId}` : ""}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open master schedule
          </Link>
        </CardHeader>
        <CardContent className="space-y-6">
          {student && assignment ? (
            <AssignSessionScheduler
              intakeId={intake.id}
              studentId={student.id}
              tutorId={assignment.tutor_id ?? ""}
              weekDates={weekDates}
              slots={schedulerSlots}
              operatingHours={operatingHours}
              operatingHoursUnavailableReason={
                operatingHoursResult.error
                  ? "Operating hours are unavailable. Apply the VS8 operating-hours migration to enable this view."
                  : undefined
              }
              defaultRepeatUntil={defaultRepeatUntil}
              action={createSession}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Approve intake and assign tutor to schedule sessions from the calendar grid.
            </p>
          )}
        </CardContent>
      </Card>

      {!student ? (
        <ApproveIntakeForm intakeId={intake.id} action={approveIntake} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Student</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{student.full_name}</span>
              <Badge variant="secondary" className="capitalize">
                {student.status ?? "active"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {formatDate(student.created_at)}
            </p>
          </CardContent>
        </Card>
      )}

      {student && assignment ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Active assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Tutor assigned:{" "}
                {tutors.find((tutor) => tutor.id === assignment?.tutor_id)
                  ?.full_name ?? "Tutor"}
              </p>
              <p>You can now schedule sessions.</p>
            </CardContent>
          </Card>
        </>
      ) : student ? (
        tutors.length > 0 ? (
          <AssignTutorForm
            intakeId={intake.id}
            studentId={student.id}
            tutors={tutors}
            action={assignTutor}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Assign a tutor</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              No tutors are available yet. Create a tutor profile to continue.
            </CardContent>
          </Card>
        )
      ) : null}

      {student ? (
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {formatDate(session.session_date)}
                      </TableCell>
                      <TableCell>
                        {formatTimeRange(session.start_time, session.end_time)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {session.status ?? "scheduled"}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.status === "completed" ? (
                          session.billed_to_membership ? (
                            <span className="text-xs text-muted-foreground">
                              Billed
                            </span>
                          ) : (
                            <form action={handleCompleteSession}>
                              <input
                                type="hidden"
                                name="session_id"
                                value={session.id}
                              />
                              <input
                                type="hidden"
                                name="intake_id"
                                value={intake.id}
                              />
                              <button
                                type="submit"
                                className={cn(
                                  buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                  })
                                )}
                                data-testid={`session-bill-${session.id}`}
                              >
                                Bill hours
                              </button>
                            </form>
                          )
                        ) : (
                          <form action={handleCompleteSession}>
                            <input
                              type="hidden"
                              name="session_id"
                              value={session.id}
                            />
                            <input
                              type="hidden"
                              name="intake_id"
                              value={intake.id}
                            />
                            <button
                              type="submit"
                              className={cn(
                                buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                })
                              )}
                              data-testid={`session-complete-${session.id}`}
                            >
                              Mark complete
                            </button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm">
                      No sessions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
