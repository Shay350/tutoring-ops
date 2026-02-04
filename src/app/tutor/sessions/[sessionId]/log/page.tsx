import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatHours } from "@/lib/format";
import { isUuid, normalizeShortCode } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { saveSessionLog } from "./actions";
import SessionLogForm from "./session-log-form";

type PageProps = {
  params: { sessionId: string };
};

export default async function SessionLogPage({ params }: PageProps) {
  const supabase = await createClient();
  const sessionId = params.sessionId;
  const isSessionUuid = isUuid(sessionId);
  const lookupValue = isSessionUuid
    ? sessionId
    : normalizeShortCode(sessionId);

  const sessionQuery = supabase
    .from("sessions")
    .select(
      "id, student_id, session_date, status, students(id, full_name), session_logs(id, topics, homework, next_plan, customer_summary, private_notes)"
    );

  const { data: session } = isSessionUuid
    ? await sessionQuery.eq("id", lookupValue).maybeSingle()
    : await sessionQuery.ilike("short_code", lookupValue).maybeSingle();

  if (!session) {
    notFound();
  }

  const studentId = session.students?.[0]?.id ?? null;

  const { data: membership } = studentId
    ? await supabase
        .from("memberships")
        .select("status, hours_remaining, plan_type, renewal_date")
        .eq("student_id", studentId)
        .maybeSingle()
    : { data: null };

  const log = Array.isArray(session.session_logs)
    ? session.session_logs[0]
    : session.session_logs ?? null;

  const { data: progressSnapshot } = await supabase
    .from("progress_snapshots")
    .select("attendance_rate, homework_completion, notes, updated_at")
    .eq("student_id", session.student_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Tutor</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Session log
          </h1>
        </div>
        <Link
          href="/tutor"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
        </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {session.students?.[0]?.full_name ?? "Student"}
              </span>
              <Badge variant="secondary" className="capitalize">
                {session.status ?? "scheduled"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(session.session_date)}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Hours remaining:</span>
              <span data-testid="session-hours-remaining">
                {membership
                  ? `${formatHours(membership.hours_remaining)} hrs`
                  : "—"}
              </span>
              {membership?.status ? (
                <Badge variant="secondary" className="capitalize">
                  {membership.status}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

      <SessionLogForm
        sessionId={session.id}
        defaults={{
          topics: log?.topics ?? "",
          homework: log?.homework ?? "",
          next_plan: log?.next_plan ?? "",
          customer_summary: log?.customer_summary ?? "",
          private_notes: log?.private_notes ?? "",
          attendance_rate: progressSnapshot?.attendance_rate ?? null,
          homework_completion: progressSnapshot?.homework_completion ?? null,
          progress_notes: progressSnapshot?.notes ?? "",
        }}
        action={saveSessionLog}
      />
    </div>
  );
}
