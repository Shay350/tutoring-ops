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
  { label: "Active students", value: "2", detail: "1 upcoming session" },
  { label: "Membership", value: "Growth Plan", detail: "Renews Feb 1" },
  { label: "Recent updates", value: "3", detail: "Last sent Jan 24" },
];

const schedule = [
  { date: "Mon, Jan 29", session: "Math - Mia", status: "Upcoming" },
  { date: "Wed, Jan 31", session: "Reading - Lucas", status: "Upcoming" },
  { date: "Fri, Feb 2", session: "Progress review", status: "Draft" },
];

export default function CustomerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer dashboard</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Progress overview
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
          <CardTitle>Upcoming schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((item) => (
                <TableRow key={item.date}>
                  <TableCell className="font-medium">{item.date}</TableCell>
                  <TableCell>{item.session}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Draft" ? "outline" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
