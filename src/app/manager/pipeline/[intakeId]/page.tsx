import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import {
  ApproveIntakeForm,
  AssignTutorForm,
  CreateSessionForm,
} from "../pipeline-forms";

type PageProps = {
  params: { intakeId: string };
};

export default async function IntakeDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const intakeId = params.intakeId;

  const [intakeResult, studentResult] = await Promise.all([
    supabase
      .from("intakes")
      .select(
        "id, customer_id, status, student_name, student_grade, subjects, availability, goals, location, created_at"
      )
      .eq("id", intakeId)
      .maybeSingle(),
    supabase
      .from("students")
      .select("id, full_name, status, created_at")
      .eq("intake_id", intakeId)
      .maybeSingle(),
  ]);

  if (!intakeResult.data) {
    notFound();
  }

  const intake = intakeResult.data;
  const student = studentResult.data ?? null;

  let assignment:
    | { id: string; tutor_id: string | null; status: string | null }
    | null = null;
  let sessions: Array<{
    id: string;
    session_date: string | null;
    status: string | null;
  }> = [];
  let tutors: Array<{ id: string; full_name: string | null }> = [];

  if (student) {
    const [assignmentResult, sessionsResult, tutorsResult] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, tutor_id, status")
        .eq("student_id", student.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("id, session_date, status")
        .eq("student_id", student.id)
        .order("session_date", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "tutor")
        .order("full_name", { ascending: true }),
    ]);

    assignment = assignmentResult.data ?? null;
    sessions = sessionsResult.data ?? [];
    tutors = tutorsResult.data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Manager</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Intake review
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/manager/pipeline">Back to pipeline</Link>
        </Button>
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

      {!student ? (
        <ApproveIntakeForm intakeId={intake.id} />
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
          />
        </>
      ) : student ? (
        tutors.length > 0 ? (
          <AssignTutorForm
            intakeId={intake.id}
            studentId={student.id}
            tutors={tutors}
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {formatDate(session.session_date)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {session.status ?? "scheduled"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm">
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
