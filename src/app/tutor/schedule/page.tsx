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

export default async function TutorSchedulePage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, session_date, status, students(id, full_name), session_logs(id)"
    )
    .order("session_date", { ascending: true });

  const sessionRows = sessions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tutor</p>
        <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Log</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionRows.length > 0 ? (
                sessionRows.map((session) => {
                  const hasLog = Array.isArray(session.session_logs)
                    ? session.session_logs.length > 0
                    : Boolean(session.session_logs);

                  return (
                    <TableRow key={session.id} data-testid="session-row">
                      <TableCell className="font-medium">
                        {formatDate(session.session_date)}
                      </TableCell>
                      <TableCell>
                        {session.students?.[0]?.full_name ?? "Student"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {session.status ?? "scheduled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/tutor/sessions/${session.id}/log`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                          data-testid={`schedule-log-${session.id}`}
                        >
                          {hasLog ? "Edit log" : "Start log"}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    No sessions scheduled yet.
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
