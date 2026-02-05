import { NextResponse } from "next/server";

import { isUuid, normalizeShortCode } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const sessionParam = url.searchParams.get("session_id");

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  let profile = null;
  let profileError: string | null = null;

  if (user?.id) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, pending, full_name")
      .eq("id", user.id)
      .maybeSingle();

    profile = data ?? null;
    profileError = error?.message ?? null;
  }

  let session = null;
  let sessionError: string | null = null;
  let sessionDetail = null;
  let sessionDetailError: string | null = null;
  let sessionLookup: { column: "id" | "short_code"; value: string } | null =
    null;
  let assignment = null;
  let assignmentError: string | null = null;

  if (sessionParam) {
    const lookupColumn = isUuid(sessionParam) ? "id" : "short_code";
    const lookupValue = isUuid(sessionParam)
      ? sessionParam
      : normalizeShortCode(sessionParam);

    sessionLookup = { column: lookupColumn, value: lookupValue };

    const { data, error } = await supabase
      .from("sessions")
      .select("id, short_code, tutor_id, student_id, status")
      .eq(lookupColumn, lookupValue)
      .maybeSingle();

    session = data ?? null;
    sessionError = error?.message ?? null;

    const { data: detail, error: detailError } = await supabase
      .from("sessions")
      .select(
        "id, student_id, session_date, status, students(id, full_name), session_logs(id, topics, homework, next_plan, customer_summary, private_notes)"
      )
      .eq(lookupColumn, lookupValue)
      .maybeSingle();

    sessionDetail = detail ?? null;
    sessionDetailError = detailError?.message ?? null;

    if (user?.id && (detail?.student_id ?? session?.student_id)) {
      const studentId = detail?.student_id ?? session?.student_id ?? null;
      if (studentId) {
        const { data: assignmentData, error: assignmentErr } = await supabase
          .from("assignments")
          .select("id, student_id, tutor_id, status")
          .eq("student_id", studentId)
          .eq("tutor_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        assignment = assignmentData ?? null;
        assignmentError = assignmentErr?.message ?? null;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    path,
    user: user ? { id: user.id, email: user.email ?? null } : null,
    userError: userError?.message ?? null,
    profile,
    profileError,
    sessionLookup,
    session,
    sessionError,
    sessionDetail,
    sessionDetailError,
    assignment,
    assignmentError,
  });
}
