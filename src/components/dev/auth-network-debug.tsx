"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function extractSessionId(pathname: string | null): string | null {
  if (!pathname) {
    return null;
  }

  const match = pathname.match(/^\/tutor\/sessions\/([^/]+)\/log/);
  return match?.[1] ?? null;
}

export default function AuthNetworkDebug() {
  const pathname = usePathname();

  useEffect(() => {
    const sessionId = extractSessionId(pathname);
    const params = new URLSearchParams();

    if (pathname) {
      params.set("path", pathname);
    }

    if (sessionId) {
      params.set("session_id", sessionId);
    }

    params.set("ts", Date.now().toString());

    fetch(`/api/dev/auth-debug?${params.toString()}`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        console.info("[dev] auth-debug", data);
      })
      .catch((error) => {
        console.info("[dev] auth-debug failed", error);
      });
  }, [pathname]);

  return null;
}
