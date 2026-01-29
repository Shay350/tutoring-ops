import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import SessionLogForm from "./session-log-form";

type PageProps = {
  params: { sessionId: string };
};

export default async function SessionLogPage({ params }: PageProps) {
  const supabase = await createClient();
  const sessionId = params.sessionId;

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, session_date, status, students(id, full_name), session_logs(id, topics, homework, next_plan, customer_summary, private_notes)"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    notFound();
  }

  const log = Array.isArray(session.session_logs)
    ? session.session_logs[0]
    : session.session_logs ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Tutor</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Session log
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/tutor">Back to dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {session.students?.full_name ?? "Student"}
            </span>
            <Badge variant="secondary" className="capitalize">
              {session.status ?? "scheduled"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(session.session_date)}
          </p>
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
        }}
      />
    </div>
  );
}
