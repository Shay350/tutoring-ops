import Link from "next/link";
import { redirect } from "next/navigation";

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
import { isProfileBlocked } from "@/lib/auth-utils";
import { formatDate } from "@/lib/format";
import type { Role } from "@/lib/roles";
import { getSingle } from "@/lib/relations";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function DevSeedIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, pending, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  if (isProfileBlocked(profile)) {
    redirect("/no-access");
  }

  const role = (profile.role ?? "") as Role;

  const isManager = role === "manager";
  const isTutor = role === "tutor";
  const isCustomer = role === "customer";

  const [intakesResult, studentsResult, sessionsResult] = await Promise.all([
    isManager
      ? supabase
          .from("intakes")
          .select("id, short_code, student_name, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    isManager || isCustomer
      ? supabase
          .from("students")
          .select("id, short_code, full_name, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    isManager || isTutor
      ? supabase
          .from("sessions")
          .select(
            "id, short_code, session_date, status, tutor_id, students(id, full_name)"
          )
          .order("session_date", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  const intakes = intakesResult.data ?? [];
  const students = studentsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];

  const tutorSessions = isTutor
    ? sessions.filter((session) => session.tutor_id === user.id)
    : sessions;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Dev tools</p>
        <h1 className="text-2xl font-semibold text-slate-900">Seed index</h1>
        <p className="text-sm text-muted-foreground">
          Use the short codes below directly in URLs.
        </p>
      </div>

      {isManager ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent intakes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intakes.length > 0 ? (
                  intakes.map((intake) => {
                    const code = intake.short_code ?? intake.id;
                    return (
                      <TableRow key={intake.id}>
                        <TableCell className="font-medium">{code}</TableCell>
                        <TableCell>{intake.student_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {intake.status ?? "submitted"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(intake.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/manager/pipeline/${code}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" })
                            )}
                          >
                            Open
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm">
                      No intakes found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {isManager || isCustomer ? (
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student) => {
                    const code = student.short_code ?? student.id;
                    const base = isManager ? "/manager/students" : "/customer/students";
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{code}</TableCell>
                        <TableCell>{student.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {student.status ?? "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(student.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`${base}/${code}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" })
                            )}
                          >
                            Open
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm">
                      No students found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {isManager || isTutor ? (
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isTutor ? tutorSessions : sessions).length > 0 ? (
                  (isTutor ? tutorSessions : sessions).map((session) => {
                    const code = session.short_code ?? session.id;
                    const student = getSingle(session.students);
                    return (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{code}</TableCell>
                        <TableCell>
                          {student?.full_name ?? "Student"}
                        </TableCell>
                        <TableCell>{formatDate(session.session_date)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {session.status ?? "scheduled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isTutor ? (
                            <Link
                              href={`/tutor/sessions/${code}/log`}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" })
                              )}
                            >
                              Open log
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Available to assigned tutor
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm">
                      No sessions found.
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
