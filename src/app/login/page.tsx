import Link from "next/link";
import { cookies, headers } from "next/headers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

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
    return "OAuth sign-in failed: missing authorization code. Please try again.";
  }
  if (message === "missing_code") {
    return "OAuth sign-in failed: missing authorization code. Please try again.";
  }
  return `OAuth sign-in failed: ${message}`;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const cookieMessage = cookieStore.get("oauth_error")?.value ?? null;
  const referer = (await headers()).get("referer") ?? "";
  const refererMessage = referer.includes("/auth/callback")
    ? "missing_code"
    : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rawMessage =
    resolvedSearchParams?.message ??
    resolvedSearchParams?.error_description ??
    cookieMessage ??
    refererMessage ??
    null;
  const isOAuthError =
    resolvedSearchParams?.error === "oauth" || Boolean(rawMessage);
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
            <>
              {oauthMessage ? (
                <p className="text-sm text-red-600">{oauthMessage}</p>
              ) : null}
              <LoginForm
                initialError={oauthMessage}
                suppressOAuthMessage={Boolean(oauthMessage)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
