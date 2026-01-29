import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function buildLoginRedirect(origin: string, message?: string) {
  const redirectUrl = new URL("/login", origin);
  redirectUrl.searchParams.set("error", "oauth");
  if (message) {
    redirectUrl.searchParams.set("message", message);
  }
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");
  const nextPath = searchParams.get("next");
  const redirectPath =
    nextPath && nextPath.startsWith("/") ? nextPath : "/";

  if (providerError || !code) {
    const message =
      providerErrorDescription ?? providerError ?? "missing_code";
    console.error("OAuth callback missing code or provider error", {
      providerError,
      providerErrorDescription,
    });
    return buildLoginRedirect(origin, message);
  }

  const response = NextResponse.redirect(new URL(redirectPath, origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth code exchange failed", {
      message: error.message,
      status: error.status,
      name: error.name,
    });
    return buildLoginRedirect(origin, error.message);
  }

  return response;
}
