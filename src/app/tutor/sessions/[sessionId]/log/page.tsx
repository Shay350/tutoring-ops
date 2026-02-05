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
  params: { sessionId?: string } | Promise<{ sessionId?: string }>;
};

export const dynamic = "force-dynamic";

export default async function SessionLogPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const supabase = await createClient();
  const sessionId = resolvedParams?.sessionId ?? "";
  const isSessionUuid = isUuid(sessionId);
  const lookupColumn: "id" | "short_code" = isSessionUuid ? "id" : "short_code";
  const lookupValue = isSessionUuid ? sessionId : normalizeShortCode(sessionId);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, student_id, session_date, status")
    .eq(lookupColumn, lookupValue)
    .maybeSingle();

  if (!session) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Tutor</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Debug: session not found
            </h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Session lookup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                lookupColumn: <span className="font-medium">{lookupColumn}</span>
              </p>
              <p>
                lookupValue: <span className="font-medium">{lookupValue}</span>
              </p>
              <p>
                authUser:{" "}
                <span className="font-medium">
                  {user?.id ?? "null"}
                </span>
              </p>
              <p>
                authError:{" "}
                <span className="font-medium">
                  {authError?.message ?? "null"}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    notFound();
  }

  const studentId = session.student_id ?? null;

  const [{ data: student }, { data: log }] = await Promise.all([
    studentId
      ? supabase
          .from("students")
          .select("id, full_name")
          .eq("id", studentId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("session_logs")
      .select("id, topics, homework, next_plan, customer_summary, private_notes")
      .eq("session_id", session.id)
      .maybeSingle(),
  ]);

  const { data: membership } = studentId
    ? await supabase
        .from("memberships")
        .select("status, hours_remaining, plan_type, renewal_date")
        .eq("student_id", studentId)
        .maybeSingle()
    : { data: null };

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
                {student?.full_name ?? "Student"}
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
