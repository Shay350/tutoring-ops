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
import { formatDate, formatHours } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerMembershipPage() {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select(
      "id, student_id, plan_type, status, hours_remaining, renewal_date, students(full_name, created_at)"
    )
    .order("renewal_date", { ascending: true });

  const membershipRows = memberships ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer</p>
        <h1 className="text-2xl font-semibold text-slate-900">Membership</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membership overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="customer-membership-list">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hours remaining</TableHead>
                <TableHead>Renewal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membershipRows.length > 0 ? (
                membershipRows.map((membership) => (
                  <TableRow
                    key={membership.id}
                    data-testid={`customer-membership-row-${membership.student_id}`}
                  >
                    <TableCell className="font-medium">
                      {membership.students?.full_name ?? "Student"}
                    </TableCell>
                    <TableCell>{membership.plan_type ?? "Plan"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {membership.status ?? "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatHours(membership.hours_remaining)} hrs
                    </TableCell>
                    <TableCell>
                      {membership.renewal_date
                        ? formatDate(membership.renewal_date)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm">
                    No membership records yet.
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
