import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function TutorNotFoundPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tutor</p>
        <h1 className="text-2xl font-semibold text-slate-900">Not found</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>We couldn&apos;t find that record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The record may not exist, or you may not have access to it.
          </p>
          <Link
            href="/tutor"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
