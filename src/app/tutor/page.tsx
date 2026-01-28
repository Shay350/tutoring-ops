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
  { label: "Sessions today", value: "3", detail: "2 in-person, 1 virtual" },
  { label: "Students", value: "6", detail: "2 active plans" },
  { label: "Logs to finish", value: "1", detail: "Due by 5 PM" },
];

const sessions = [
  { time: "9:00 AM", student: "Mia", subject: "Math", status: "Next" },
  { time: "11:30 AM", student: "Lucas", subject: "Reading", status: "Planned" },
  { time: "3:00 PM", student: "Noah", subject: "Science", status: "Planned" },
];

export default function TutorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tutor dashboard</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Today&apos;s focus
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
          <CardTitle>Today&apos;s sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((item) => (
                <TableRow key={item.time}>
                  <TableCell className="font-medium">{item.time}</TableCell>
                  <TableCell>{item.student}</TableCell>
                  <TableCell>{item.subject}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Next" ? "secondary" : "outline"}>
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
