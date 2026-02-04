import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatHours } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: { studentId: string };
};

export default async function CustomerStudentDetail({ params }: PageProps) {
  const supabase = await createClient();
  const studentId = params.studentId;

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, status, created_at")
    .or(`id.eq.${studentId},short_code.eq.${studentId}`)
    .maybeSingle();

  if (!student) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("plan_type, status, hours_remaining, renewal_date")
    .eq("student_id", student.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Student detail
          </h1>
        </div>
        <Link
          href="/customer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          data-testid="customer-student-back"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {membership ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p>{membership.plan_type ?? "Plan"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hours remaining</p>
                <p data-testid="customer-membership-hours">
                  {formatHours(membership.hours_remaining)} hrs
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Renewal date</p>
                <p>{membership.renewal_date ?? "—"}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Membership details will appear once a manager sets up a plan.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
