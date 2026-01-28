import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import LoginForm from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use your tutoring ops credentials.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="space-y-2 text-sm">
              <p className="text-slate-700">
                You are signed in as <strong>{user.email}</strong>.
              </p>
              <Link className="text-sky-700 underline" href="/">
                Return to home
              </Link>
            </div>
          ) : (
            <LoginForm />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
