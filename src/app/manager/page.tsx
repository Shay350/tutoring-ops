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

const stats = [
  { label: "Open intakes", value: "5", detail: "2 new this week" },
  { label: "Active tutors", value: "12", detail: "3 with openings" },
  { label: "Unassigned students", value: "2", detail: "Needs matching" },
];

const pipeline = [
  { name: "Harper W.", stage: "Assessment", owner: "M. Jones" },
  { name: "Eli P.", stage: "Matching", owner: "A. Singh" },
  { name: "Ava R.", stage: "Scheduled", owner: "L. Chen" },
];

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Manager dashboard</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Ops snapshot
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900">
                {item.value}
              </div>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Intake pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipeline.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.stage}</Badge>
                  </TableCell>
                  <TableCell>{item.owner}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
