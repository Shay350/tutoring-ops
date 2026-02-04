import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Page not found</CardTitle>
          <p className="text-sm text-muted-foreground">
            This page may have moved, been deleted, or is not accessible.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Home
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "default" }))}>
            Sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
