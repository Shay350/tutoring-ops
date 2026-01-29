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

import IntakeForm from "./intake-form";

export default async function CustomerIntakePage() {
  const supabase = await createClient();
  const { data: intakes } = await supabase
    .from("intakes")
    .select("id, status, student_name, subjects, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer</p>
        <h1 className="text-2xl font-semibold text-slate-900">Intake</h1>
      </div>

      <IntakeForm />

      <Card>
        <CardHeader>
          <CardTitle>Submitted intakes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intakes && intakes.length > 0 ? (
                intakes.map((intake) => (
                  <TableRow key={intake.id}>
                    <TableCell className="font-medium">
                      {intake.student_name}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(intake.subjects)
                        ? intake.subjects.join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {intake.status ?? "—"}
                    </TableCell>
                    <TableCell>{formatDateTime(intake.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    No intakes submitted yet.
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
