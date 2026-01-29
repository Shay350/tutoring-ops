import Link from "next/link";

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
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerDashboard() {
  const supabase = await createClient();

  const [openIntakesResult, tutorsResult, studentsResult, assignmentsResult, intakesResult] =
    await Promise.all([
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .neq("status", "approved"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "tutor"),
      supabase.from("students").select("id"),
      supabase.from("assignments").select("student_id, status"),
      supabase
        .from("intakes")
        .select("id, student_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const studentIds = (studentsResult.data ?? []).map((student) => student.id);
  const assignments = assignmentsResult.data ?? [];

  const assignedStudents = new Set(
    assignments
      .filter((assignment) => assignment.status === "active")
      .map((assignment) => assignment.student_id)
  );

  const unassignedCount = studentIds.filter(
    (studentId) => !assignedStudents.has(studentId)
  ).length;

  const stats = [
    {
      label: "Open intakes",
      value: String(openIntakesResult.count ?? 0),
      detail: "Awaiting review",
    },
    {
      label: "Active tutors",
      value: String(tutorsResult.count ?? 0),
      detail: "Available for matching",
    },
    {
      label: "Unassigned students",
      value: String(unassignedCount),
      detail: "Needs matching",
    },
  ];

  const recentIntakes = intakesResult.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Manager dashboard</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Ops snapshot
          </h1>
        </div>
        <Button asChild size="sm" data-testid="manager-review-intakes">
          <Link href="/manager/pipeline">Review intakes</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900">
                {item.value}
              </div>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent intakes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentIntakes.length > 0 ? (
                recentIntakes.map((intake) => (
                  <TableRow key={intake.id}>
                    <TableCell className="font-medium">
                      {intake.student_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {intake.status ?? "submitted"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(intake.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        data-testid={`manager-review-${intake.id}`}
                      >
                        <Link href={`/manager/pipeline/${intake.id}`}>Review</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    No intakes yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
