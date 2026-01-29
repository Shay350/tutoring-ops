import { parseDateKey } from "./schedule";

type SessionLogReference = { id?: string | null } | null;

type SessionRow = {
  session_date: string | null;
  session_logs?: SessionLogReference[] | SessionLogReference | null;
};

export function parsePercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric < 0 || numeric > 100) {
    return null;
  }

  return Math.round(numeric);
}

export function hasSessionLog(session: SessionRow): boolean {
  const logs = session.session_logs;
  if (Array.isArray(logs)) {
    return logs.length > 0;
  }
  return Boolean(logs);
}

export function extractLoggedSessionDates(sessions: SessionRow[]): string[] {
  const dates = sessions
    .filter((session) => Boolean(session.session_date) && hasSessionLog(session))
    .map((session) => session.session_date as string);

  return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
}

export function countLoggedSessions(sessions: SessionRow[]): number {
  return sessions.filter(
    (session) => Boolean(session.session_date) && hasSessionLog(session)
  ).length;
}

export function calculateLastSessionDelta(
  currentDate: string | null,
  previousDate: string | null
): number | null {
  if (!currentDate || !previousDate) {
    return null;
  }

  const current = parseDateKey(currentDate) ?? new Date(currentDate);
  const previous = parseDateKey(previousDate) ?? new Date(previousDate);

  if (Number.isNaN(current.getTime()) || Number.isNaN(previous.getTime())) {
    return null;
  }

  const diffMs = Math.abs(current.getTime() - previous.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
