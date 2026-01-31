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
import { formatDate, formatHours } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { updateAtRiskStatus } from "./actions";
import AtRiskForm from "./at-risk-form";

type SearchParams = { risk?: string | string[] };

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type MembershipRow = {
  id: string;
  student_id: string | null;
  plan_type: string | null;
  status: string | null;
  hours_remaining: number | null;
};

export default async function ManagerStudentsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const riskParam = Array.isArray(resolvedSearchParams?.risk)
    ? resolvedSearchParams?.risk[0]
    : resolvedSearchParams?.risk;
  const showAtRiskOnly = riskParam === "at";

  let studentsQuery = supabase
    .from("students")
    .select("id, full_name, status, created_at, at_risk, at_risk_reason")
    .order("created_at", { ascending: false });

  if (showAtRiskOnly) {
    studentsQuery = studentsQuery.eq("at_risk", true);
  }

  const [studentsResult, totalCountResult, atRiskCountResult] =
    await Promise.all([
      studentsQuery,
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("at_risk", true),
    ]);

  const students = studentsResult.data ?? [];
  const totalCount = totalCountResult.count ?? 0;
  const atRiskCount = atRiskCountResult.count ?? 0;

  const studentIds = students.map((student) => student.id);

  const { data: memberships } = studentIds.length
    ? await supabase
        .from("memberships")
        .select("id, student_id, plan_type, status, hours_remaining")
        .in("student_id", studentIds)
    : { data: [] };

  const membershipByStudent = (memberships ?? []).reduce<
    Record<string, MembershipRow>
  >((acc, membership) => {
    if (!membership?.student_id) {
      return acc;
    }
    acc[membership.student_id] = membership;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Manager</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Student status
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/manager/students"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            data-testid="risk-filter-all"
          >
            All students
          </Link>
          <Link
            href="/manager/students?risk=at"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            data-testid="risk-filter-at"
          >
            At-risk only
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {totalCount}
            </div>
            <p className="text-sm text-muted-foreground">Active roster</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              At-risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {atRiskCount}
            </div>
            <p className="text-sm text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {showAtRiskOnly ? "At-risk students" : "All students"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="manager-student-list">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Membership</TableHead>
                <TableHead>Hours remaining</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Update</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => {
                  const membership = membershipByStudent[student.id];

                  return (
                    <TableRow
                      key={student.id}
                      data-testid={`manager-student-row-${student.id}`}
                    >
                      <TableCell className="font-medium">
                        {student.full_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {student.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.at_risk ? (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-700"
                          >
                            At-risk
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Stable</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {membership ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {membership.plan_type ?? "Plan"}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {membership.status ?? "active"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No membership
                          </span>
                        )}
                      </TableCell>
                      <TableCell data-testid="manager-hours-remaining">
                        {membership
                          ? `${formatHours(membership.hours_remaining)} hrs`
                          : "—"}
                      </TableCell>
                      <TableCell>{formatDate(student.created_at)}</TableCell>
                      <TableCell>
                        <AtRiskForm
                          studentId={student.id}
                          isAtRisk={Boolean(student.at_risk)}
                          reason={student.at_risk_reason}
                          action={updateAtRiskStatus}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/manager/students/${student.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                          data-testid={`manager-student-view-${student.id}`}
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm">
                    {showAtRiskOnly
                      ? "No at-risk students right now."
                      : "No students yet."}
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
