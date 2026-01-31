import Link from "next/link";

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
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function CustomerStudentsPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, status, created_at")
    .order("created_at", { ascending: false });

  const studentIds = students?.map((student) => student.id) ?? [];
  let assignments: Array<{
    student_id: string;
    status: string | null;
    tutor_id: string | null;
  }> = [];

  if (studentIds.length > 0) {
    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select("student_id, status, tutor_id")
      .in("student_id", studentIds);

    assignments = assignmentRows ?? [];

  }

  const assignmentsByStudent = assignments.reduce<Record<string, typeof assignments>>(
    (acc, assignment) => {
      if (!acc[assignment.student_id]) {
        acc[assignment.student_id] = [];
      }
      acc[assignment.student_id].push(assignment);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            My students
          </h1>
        </div>
        <Link
          href="/customer/intake"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          data-testid="new-intake"
        >
          Submit intake
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active students</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tutor</TableHead>
                <TableHead>Added</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students && students.length > 0 ? (
                students.map((student) => {
                  const studentAssignments =
                    assignmentsByStudent[student.id] ?? [];
                  const activeAssignment = studentAssignments.find(
                    (assignment) => assignment.status === "active"
                  );

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.full_name}
                      </TableCell>
                      <TableCell className="capitalize">
                        {student.status ?? "—"}
                      </TableCell>
                      <TableCell>
                        {activeAssignment?.tutor_id ? "Assigned" : "Unassigned"}
                      </TableCell>
                      <TableCell>{formatDate(student.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/customer/students/${student.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                          data-testid={`customer-student-view-${student.id}`}
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm">
                    No students yet. Submit an intake to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happens next</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <p>
            1) Complete an intake for each student. 2) A manager will approve the
            intake and match a tutor. 3) You can view session notes and progress
            once tutoring begins.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Manager review</Badge>
            <Badge variant="secondary">Tutor assignment</Badge>
            <Badge variant="secondary">Session history</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
