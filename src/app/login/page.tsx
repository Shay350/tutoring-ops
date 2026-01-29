import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams?:
    | {
        error?: string;
        message?: string;
        error_description?: string;
      }
    | Promise<{
        error?: string;
        message?: string;
        error_description?: string;
      }>;
};

function formatOAuthMessage(message: string | null) {
  if (!message) {
    return "OAuth sign-in failed. Please try again.";
  }
  if (message === "missing_code") {
    return "OAuth sign-in failed: missing authorization code. Please try again.";
  }
  return `OAuth sign-in failed: ${message}`;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isOAuthError = resolvedSearchParams?.error === "oauth";
  const rawMessage =
    resolvedSearchParams?.message ??
    resolvedSearchParams?.error_description ??
    null;
  let message = rawMessage;
  if (message) {
    try {
      message = decodeURIComponent(message);
    } catch {
      // Leave message as-is if decoding fails.
    }
  }
  const oauthMessage = isOAuthError ? formatOAuthMessage(message) : null;

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
            <LoginForm initialError={oauthMessage} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
