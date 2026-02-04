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
import { formatDate, formatDateTime, formatHours } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { adjustMembershipHours, saveMembership } from "./actions";
import { MembershipAdjustmentForm, MembershipForm } from "./membership-forms";

type PageProps = {
  params: { studentId: string };
};

export default async function ManagerStudentDetail({ params }: PageProps) {
  const supabase = await createClient();
  const studentId = params.studentId;

  const [studentResult, membershipResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, status, created_at")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select(
        "id, plan_type, status, hours_total, hours_remaining, renewal_date, notes"
      )
      .eq("student_id", studentId)
      .maybeSingle(),
  ]);

  if (!studentResult.data) {
    notFound();
  }

  const student = studentResult.data;
  const membership = membershipResult.data ?? null;

  const { data: adjustments } = membership
    ? await supabase
        .from("membership_adjustments")
        .select("id, delta_hours, reason, created_at, profiles(full_name)")
        .eq("membership_id", membership.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Manager</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Student details
          </h1>
        </div>
        <Link
          href="/manager/students"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          data-testid="manager-student-back"
        >
          Back to students
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{student.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {student.status ?? "active"}
            </Badge>
            {membership ? (
              <Badge variant="secondary" className="capitalize">
                {membership.status ?? "active"} membership
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Added {formatDate(student.created_at)}
          </p>
          {membership ? (
            <p className="text-xs text-muted-foreground">
              {formatHours(membership.hours_remaining)} hrs remaining of{" "}
              {formatHours(membership.hours_total)} hrs
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              No membership created yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <MembershipForm
            studentId={student.id}
            membership={membership}
            action={saveMembership}
          />

          {membership ? (
            <Card>
              <CardHeader>
                <CardTitle>Adjustment history</CardTitle>
              </CardHeader>
              <CardContent>
                <Table data-testid="membership-adjustment-history">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments && adjustments.length > 0 ? (
                      adjustments.map((adjustment) => (
                        <TableRow key={adjustment.id}>
                          <TableCell>
                            {formatDateTime(adjustment.created_at)}
                          </TableCell>
                          <TableCell>
                            {adjustment.delta_hours > 0 ? "+" : ""}
                            {formatHours(adjustment.delta_hours)}
                          </TableCell>
                          <TableCell>{adjustment.reason}</TableCell>
                          <TableCell>
                            {adjustment.profiles?.[0]?.full_name ?? "Manager"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm">
                          No adjustments yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </div>
        {membership ? (
          <MembershipAdjustmentForm
            membershipId={membership.id}
            studentId={student.id}
            action={adjustMembershipHours}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Adjust hours</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Create a membership first to track hours.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
