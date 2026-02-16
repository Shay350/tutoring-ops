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
import {
  type OperatingHoursRow,
  normalizeOperatingHours,
} from "@/lib/operating-hours";
import { getWeekDates, getWeekStart } from "@/lib/schedule";
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
  CreateSessionForm,
} from "../pipeline-forms";
import WeekCalendar from "../../schedule/week-calendar";

type PageProps = {
  params: { intakeId: string } | Promise<{ intakeId: string }>;
};

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
      "id, customer_id, status, student_name, student_grade, subjects, availability, goals, location, created_at"
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

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, status, created_at")
    .eq("intake_id", intake.id)
    .maybeSingle();

  const [tutorsResult, operatingHoursResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "tutor")
      .order("full_name", { ascending: true }),
    supabase
      .from("operating_hours")
      .select("weekday, is_closed, open_time, close_time")
      .order("weekday", { ascending: true }),
  ]);

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
    .gte("session_date", weekDates[0])
    .lte("session_date", weekDates[6])
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const scheduleSessionRows = scheduleSessions ?? [];

  const sessionsByDate = scheduleSessionRows.reduce<
    Record<string, typeof scheduleSessionRows>
  >((acc, session) => {
    const key = session.session_date ?? "";
    if (!key) {
      return acc;
    }
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(session);
    return acc;
  }, {});

  const operatingHours = normalizeOperatingHours(
    (operatingHoursResult.data ?? []) as OperatingHoursRow[]
  );
  const openOperatingHours = operatingHours.filter((row) => !row.is_closed);

  const tutorNames = tutors.reduce<Record<string, string>>((acc, tutor) => {
    acc[tutor.id] = tutor.full_name ?? "Tutor";
    return acc;
  }, {});

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
              <p>{intake.location ?? "—"}</p>
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
            href="/manager/schedule"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open master schedule
          </Link>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3" data-testid="intake-operating-hours">
            <h3 className="text-sm font-semibold text-slate-900">
              Active operating hours
            </h3>
            {operatingHoursResult.error ? (
              <p className="text-sm text-muted-foreground">
                Operating hours are unavailable. Apply the VS8 operating-hours
                migration to enable this view.
              </p>
            ) : openOperatingHours.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>Close</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openOperatingHours.map((row) => (
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

          <WeekCalendar
            weekDates={weekDates}
            sessionsByDate={sessionsByDate}
            tutorNames={tutorNames}
            operatingHours={operatingHours}
            capacityPerSlot={Math.max(tutors.length, 1)}
          />
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
          <CreateSessionForm
            intakeId={intake.id}
            studentId={student.id}
            tutorId={assignment.tutor_id ?? ""}
            action={createSession}
          />
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
