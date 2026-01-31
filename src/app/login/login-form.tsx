"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialError?: string | null;
  suppressOAuthMessage?: boolean;
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

function readCookieValue(name: string) {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

export default function LoginForm({
  initialError = null,
  suppressOAuthMessage = false,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const errorParam = searchParams.get("error");
  const rawMessage =
    searchParams.get("message") ?? searchParams.get("error_description");
  let message = rawMessage;
  if (message) {
    try {
      message = decodeURIComponent(message);
    } catch {
      // Leave message as-is if decoding fails.
    }
  }
  let cookieMessage = readCookieValue("oauth_error");
  if (cookieMessage) {
    try {
      cookieMessage = decodeURIComponent(cookieMessage);
    } catch {
      // Leave cookie message as-is if decoding fails.
    }
  }
  const referrer =
    typeof document === "undefined" ? "" : document.referrer ?? "";
  const referrerOAuthFallback = referrer.includes("/auth/callback")
    ? formatOAuthMessage("missing_code")
    : null;
  const oauthMessage = suppressOAuthMessage
    ? null
    : initialError ??
      (errorParam === "oauth" || rawMessage
        ? formatOAuthMessage(message)
        : cookieMessage
          ? formatOAuthMessage(cookieMessage)
          : referrerOAuthFallback);

  const error = formError ?? (hasInteracted ? null : oauthMessage);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasInteracted(true);
    setFormError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setFormError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    setHasInteracted(true);
    setFormError(null);
    setIsOAuthSubmitting(true);

    const supabase = createClient();
    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setFormError(oauthError.message);
      setIsOAuthSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@tutorops.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
      <Button
        className="w-full"
        disabled={isOAuthSubmitting}
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
      >
        {isOAuthSubmitting ? "Connecting..." : "Continue with Google"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Contact a manager if you need access or a password reset.
      </p>
    </form>
  );
}
