import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const roles = [
  {
    title: "Customer portal",
    items: ["Progress overview", "Schedule view", "Membership details"],
  },
  {
    title: "Tutor workspace",
    items: ["Daily schedule", "Session logs", "Student progress"],
  },
  {
    title: "Manager console",
    items: ["Intake pipeline", "Matching", "Reporting & settings"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
        <div className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            Internal tutoring ops
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
              Tutoring Ops
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              A single-organization hub for customers, tutors, and managers to
              keep schedules, progress, and communication in sync.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={buttonVariants({ variant: "default" })}>
              Sign in
            </Link>
            <Link
              href="/customer"
              className={cn(buttonVariants({ variant: "outline" }), "bg-white")}
            >
              Customer view
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.title}>
              <CardHeader>
                <CardTitle className="text-base">{role.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {role.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
