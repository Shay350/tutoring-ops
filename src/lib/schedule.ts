export type WeekdayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type SessionTimeSlot = {
  session_date: string;
  start_time: string | null;
  end_time: string | null;
};

const weekdayOrder: WeekdayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const weekdayToIndex: Record<WeekdayKey, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function normalizeWeekdays(values: string[]): WeekdayKey[] {
  const normalized = values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => weekdayOrder.includes(value as WeekdayKey)) as WeekdayKey[];

  return Array.from(new Set(normalized));
}

export function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getWeekStart(date: Date): Date {
  const day = date.getUTCDay();
  const offset = (day + 6) % 7;
  return addDaysUtc(date, -offset);
}

export function getWeekDates(startDate: Date): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    formatDateKey(addDaysUtc(startDate, index))
  );
}

export function expandWeeklyRecurrence(params: {
  startDate: string;
  endDate: string;
  weekdays: WeekdayKey[];
}): string[] {
  const start = parseDateKey(params.startDate);
  const end = parseDateKey(params.endDate);

  if (!start || !end) {
    return [];
  }

  if (start.getTime() > end.getTime()) {
    return [];
  }

  const weekdaySet = new Set(params.weekdays.map((day) => weekdayToIndex[day]));
  if (weekdaySet.size === 0) {
    return [];
  }

  const results: string[] = [];
  for (let current = start; current.getTime() <= end.getTime(); ) {
    if (weekdaySet.has(current.getUTCDay())) {
      results.push(formatDateKey(current));
    }

    current = addDaysUtc(current, 1);
  }

  return results;
}

export function parseTimeToMinutes(value: string): number | null {
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function validateTimeRange(start: string, end: string): string | null {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes === null || endMinutes === null) {
    return "Provide valid start and end times.";
  }

  if (endMinutes <= startMinutes) {
    return "End time must be after start time.";
  }

  return null;
}

export function timeRangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function findOverlap(
  existing: SessionTimeSlot[],
  incoming: SessionTimeSlot[]
): string | null {
  const existingByDate = existing.reduce<Record<string, SessionTimeSlot[]>>(
    (acc, session) => {
      const key = session.session_date;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(session);
      return acc;
    },
    {}
  );

  const incomingByDate = incoming.reduce<Record<string, SessionTimeSlot[]>>(
    (acc, session) => {
      const key = session.session_date;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(session);
      return acc;
    },
    {}
  );

  for (const [dateKey, sessions] of Object.entries(incomingByDate)) {
    const normalized = sessions
      .map((session) => {
        if (!session.start_time || !session.end_time) {
          return null;
        }

        const startMinutes = parseTimeToMinutes(session.start_time);
        const endMinutes = parseTimeToMinutes(session.end_time);
        if (startMinutes === null || endMinutes === null) {
          return null;
        }

        return {
          startMinutes,
          endMinutes,
        };
      })
      .filter((value) => value !== null) as Array<{
      startMinutes: number;
      endMinutes: number;
    }>;

    normalized.sort((a, b) => a.startMinutes - b.startMinutes);

    for (let i = 1; i < normalized.length; i += 1) {
      if (normalized[i - 1].endMinutes > normalized[i].startMinutes) {
        return `Overlapping sessions detected on ${dateKey}.`;
      }
    }
  }

  for (const session of incoming) {
    if (!session.start_time || !session.end_time) {
      return "Start and end time are required.";
    }

    const startMinutes = parseTimeToMinutes(session.start_time);
    const endMinutes = parseTimeToMinutes(session.end_time);

    if (startMinutes === null || endMinutes === null) {
      return "Provide valid start and end times.";
    }

    const existingSessions = existingByDate[session.session_date] ?? [];

    for (const existingSession of existingSessions) {
      if (!existingSession.start_time || !existingSession.end_time) {
        return `An existing session on ${session.session_date} is missing a time. Update it before scheduling.`;
      }

      const existingStart = parseTimeToMinutes(existingSession.start_time);
      const existingEnd = parseTimeToMinutes(existingSession.end_time);

      if (existingStart === null || existingEnd === null) {
        return `An existing session on ${session.session_date} has an invalid time. Update it before scheduling.`;
      }

      if (timeRangesOverlap(startMinutes, endMinutes, existingStart, existingEnd)) {
        return `Tutor is already booked on ${session.session_date}.`;
      }
    }
  }

  return null;
}
