import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTimeRange } from "@/lib/format";
import { formatDateKey } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerSchedulePage() {
  const supabase = await createClient();
  const todayKey = formatDateKey(new Date());

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, session_date, start_time, end_time, status, students(id, full_name)")
    .gte("session_date", todayKey)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const sessionRows = sessions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Upcoming sessions
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="upcoming-sessions">
              {sessionRows.length > 0 ? (
                sessionRows.map((session) => (
                  <TableRow key={session.id} data-testid="upcoming-session-row">
                    <TableCell className="font-medium">
                      {formatDate(session.session_date)}
                    </TableCell>
                    <TableCell>
                      {formatTimeRange(session.start_time, session.end_time)}
                    </TableCell>
                    <TableCell>
                      {session.students?.[0]?.full_name ?? "Student"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {session.status ?? "scheduled"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    No upcoming sessions yet.
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
