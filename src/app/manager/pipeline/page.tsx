import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type SearchParams = { q?: string };

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function ManagerPipelinePage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const supabase = await createClient();
  const searchQuery = String(resolvedSearchParams?.q ?? "").trim();
  let intakeQuery = supabase
    .from("intakes")
    .select(
      "id, short_code, student_name, student_grade, status, subjects, created_at"
    )
    .order("created_at", { ascending: false });

  if (searchQuery) {
    intakeQuery = intakeQuery.or(
      `student_name.ilike.%${searchQuery}%,student_grade.ilike.%${searchQuery}%`
    );
  }

  const { data: intakes } = await intakeQuery;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Manager</p>
        <h1 className="text-2xl font-semibold text-slate-900">Intake pipeline</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Intake queue</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Search student name or grade"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="intake-search"
            />
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
          </form>
          <Table data-testid="intake-list">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intakes && intakes.length > 0 ? (
                intakes.map((intake) => {
                  const intakeCode = intake.short_code ?? intake.id;

                  return (
                  <TableRow key={intake.id} data-testid="intake-row">
                    <TableCell className="font-medium">
                      {intake.student_name}
                    </TableCell>
                    <TableCell>{intake.student_grade ?? "—"}</TableCell>
                    <TableCell>
                      {Array.isArray(intake.subjects)
                        ? intake.subjects.join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {intake.status ?? "submitted"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(intake.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/manager/pipeline/${intakeCode}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                        data-testid={`pipeline-review-${intake.id}`}
                      >
                        Review
                      </Link>
                    </TableCell>
                  </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm">
                    No intakes to review.
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
