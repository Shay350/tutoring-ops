import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import SignOutButton from "./sign-out-button";

export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Not authorized</CardTitle>
          <p className="text-sm text-muted-foreground">
            Not authorized. Contact admin.
          </p>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-slate-700">
            Your account is pending approval.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
