import { isProfileBlocked } from "@/lib/auth-utils";
import { toCsv } from "@/lib/csv";
import { buildMonthRange, normalizeMonth } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    return { response: new Response("Unauthorized", { status: 401 }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, pending")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { response: new Response("Unauthorized", { status: 401 }) } as const;
  }

  if (isProfileBlocked(profile) || profile.role !== "manager") {
    return { response: new Response("Forbidden", { status: 403 }) } as const;
  }

  return { supabase } as const;
}

type SessionLogRow = {
  id: string;
  topics: string | null;
  homework: string | null;
  next_plan: string | null;
  customer_summary: string | null;
  private_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SessionRow = {
  id: string;
  session_date: string | null;
  student_id: string | null;
  tutor_id: string | null;
  students?: { full_name: string | null }[] | null;
  session_logs?: SessionLogRow[] | SessionLogRow | null;
};

export async function GET(request: NextRequest) {
  const monthParam = request.nextUrl.searchParams.get("month");
  const month = normalizeMonth(monthParam);

  if (!month) {
    return new Response("Invalid month", { status: 400 });
  }

  const guard = await requireManager();
  if ("response" in guard) {
    return guard.response;
  }

  const range = buildMonthRange(month);

  const { data: sessions, error } = await guard.supabase
    .from("sessions")
    .select(
      "id, session_date, student_id, tutor_id, students(full_name), session_logs(id, topics, homework, next_plan, customer_summary, private_notes, created_at, updated_at)"
    )
    .gte("session_date", range.startDate)
    .lte("session_date", range.endDate)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error) {
    return new Response("Unable to export session logs", { status: 500 });
  }

  const sessionRows = (sessions ?? []) as SessionRow[];
  const tutorIds = Array.from(
    new Set(sessionRows.map((session) => session.tutor_id).filter(Boolean))
  ) as string[];

  const { data: tutorProfiles } = tutorIds.length
    ? await guard.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", tutorIds)
    : { data: [] };

  const tutorNames = (tutorProfiles ?? []).reduce<Record<string, string>>(
    (acc, profile) => {
      if (profile.id) {
        acc[profile.id] = profile.full_name ?? "Tutor";
      }
      return acc;
    },
    {}
  );

  const headers = [
    "log_id",
    "session_id",
    "session_date",
    "student_id",
    "student_name",
    "tutor_id",
    "tutor_name",
    "topics",
    "homework",
    "next_plan",
    "customer_summary",
    "private_notes",
    "created_at",
    "updated_at",
  ];

  const rows = sessionRows.flatMap((session) => {
    const logs = Array.isArray(session.session_logs)
      ? session.session_logs
      : session.session_logs
        ? [session.session_logs]
        : [];

    if (logs.length === 0) {
      return [];
    }

    const studentName = session.students?.[0]?.full_name ?? "";
    const tutorName = session.tutor_id ? tutorNames[session.tutor_id] ?? "" : "";

    return logs.map((log) => [
      log.id,
      session.id,
      session.session_date,
      session.student_id,
      studentName,
      session.tutor_id,
      tutorName,
      log.topics,
      log.homework,
      log.next_plan,
      log.customer_summary,
      log.private_notes,
      log.created_at,
      log.updated_at,
    ]);
  });

  const csv = toCsv(headers, rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="session-logs-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
