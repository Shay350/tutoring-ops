import { isProfileBlocked } from "@/lib/auth-utils";
import { toCsv } from "@/lib/csv";
import { buildMonthRange, normalizeMonth } from "@/lib/reports";
import { getSingle } from "@/lib/relations";
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

type SessionRow = {
  id: string;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  billed_to_membership: boolean | null;
  student_id: string | null;
  tutor_id: string | null;
  created_at: string | null;
  students?: { full_name: string | null }[] | { full_name: string | null } | null;
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
      "id, session_date, start_time, end_time, status, billed_to_membership, student_id, tutor_id, created_at, students(full_name)"
    )
    .gte("session_date", range.startDate)
    .lte("session_date", range.endDate)
    .neq("status", "canceled")
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error) {
    return new Response("Unable to export sessions", { status: 500 });
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
    "session_id",
    "session_date",
    "start_time",
    "end_time",
    "status",
    "billed_to_membership",
    "student_id",
    "student_name",
    "tutor_id",
    "tutor_name",
    "created_at",
  ];

  const rows = sessionRows.map((session) => [
    session.id,
    session.session_date,
    session.start_time,
    session.end_time,
    session.status,
    session.billed_to_membership,
    session.student_id,
    getSingle(session.students)?.full_name ?? "",
    session.tutor_id,
    session.tutor_id ? tutorNames[session.tutor_id] ?? "" : "",
    session.created_at,
  ]);

  const csv = toCsv(headers, rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sessions-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
