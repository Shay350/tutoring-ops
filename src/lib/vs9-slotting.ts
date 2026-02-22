import type { OperatingHoursRow } from "./operating-hours";
import {
  mapOperatingHoursByWeekday,
  operatingHoursWindowMinutes,
} from "./operating-hours";
import { addDaysUtc, formatDateKey, parseTimeToMinutes } from "./schedule";

type PreferredWindow = {
  startMinutes: number;
  endMinutes: number;
  weight: number;
  label: string;
};

export type ParsedIntakeAvailability = {
  source: "none" | "heuristic";
  allowedWeekdays: number[] | null;
  preferredWindows: Array<{
    startTime: string;
    endTime: string;
    weight: number;
    label: string;
  }>;
};

export type SlottingSuggestionReasonsV1 = {
  version: 1;
  generated: {
    intakeAvailability: ParsedIntakeAvailability;
    rules: {
      horizonDays: number;
      durationMinutes: number;
      capacityPerTutorHour: number;
    };
    ranking: {
      dayOffset: number;
      weekday: number;
      startMinutes: number;
      overlapCount: number;
      preferenceBonus: number;
      score: number;
    };
  };
  manager?: {
    decision?: {
      kind: "approve" | "reject";
      note?: string | null;
      at?: string | null;
    };
  };
};

export type SlottingSuggestionCandidate = {
  tutorId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  score: number;
  reasons: SlottingSuggestionReasonsV1;
};

export type SlottingExistingSession = {
  tutorId: string;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status?: string | null;
};

function toTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseAllowedWeekdays(text: string): number[] | null {
  const t = normalizeText(text);
  if (!t) {
    return null;
  }

  const weekdayAliases: Array<[RegExp, number[]]> = [
    [/\bweekdays?\b/g, [1, 2, 3, 4, 5]],
    [/\bweekends?\b/g, [0, 6]],
    [/\bsundays?\b|\bsun\b/g, [0]],
    [/\bmondays?\b|\bmon\b/g, [1]],
    [/\btuesdays?\b|\btue\b|\btues\b/g, [2]],
    [/\bwednesdays?\b|\bwed\b/g, [3]],
    [/\bthursdays?\b|\bthu\b|\bthur\b|\bthurs\b/g, [4]],
    [/\bfridays?\b|\bfri\b/g, [5]],
    [/\bsaturdays?\b|\bsat\b/g, [6]],
  ];

  const allowed = new Set<number>();
  for (const [pattern, days] of weekdayAliases) {
    if (pattern.test(t)) {
      for (const day of days) {
        allowed.add(day);
      }
    }
  }

  return allowed.size ? Array.from(allowed).sort((a, b) => a - b) : null;
}

function parsePreferredWindows(text: string): PreferredWindow[] {
  const t = normalizeText(text);
  if (!t) {
    return [];
  }

  const windows: PreferredWindow[] = [];

  const timeOfDayWindows: Array<{
    pattern: RegExp;
    start: number;
    end: number;
    label: string;
  }> = [
    { pattern: /\bmornings?\b/g, start: 9 * 60, end: 12 * 60, label: "morning" },
    {
      pattern: /\bafternoons?\b/g,
      start: 12 * 60,
      end: 17 * 60,
      label: "afternoon",
    },
    { pattern: /\bevenings?\b/g, start: 17 * 60, end: 20 * 60, label: "evening" },
  ];

  for (const entry of timeOfDayWindows) {
    if (entry.pattern.test(t)) {
      windows.push({
        startMinutes: entry.start,
        endMinutes: entry.end,
        weight: 2,
        label: entry.label,
      });
    }
  }

  const afterMatch = t.match(
    /\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/
  );
  if (afterMatch) {
    const hour = Number(afterMatch[1]);
    const minutes = Number(afterMatch[2] ?? "0");
    const meridiem = afterMatch[3];
    if (hour >= 1 && hour <= 12 && minutes >= 0 && minutes <= 59) {
      const baseHour = hour % 12;
      const hour24 = meridiem === "pm" ? baseHour + 12 : baseHour;
      const startMinutes = hour24 * 60 + minutes;
      windows.push({
        startMinutes,
        endMinutes: 24 * 60,
        weight: 3,
        label: `after ${toTimeInput(startMinutes)}`,
      });
    }
  }

  const beforeMatch = t.match(
    /\bbefore\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/
  );
  if (beforeMatch) {
    const hour = Number(beforeMatch[1]);
    const minutes = Number(beforeMatch[2] ?? "0");
    const meridiem = beforeMatch[3];
    if (hour >= 1 && hour <= 12 && minutes >= 0 && minutes <= 59) {
      const baseHour = hour % 12;
      const hour24 = meridiem === "pm" ? baseHour + 12 : baseHour;
      const endMinutes = hour24 * 60 + minutes;
      windows.push({
        startMinutes: 0,
        endMinutes,
        weight: 3,
        label: `before ${toTimeInput(endMinutes)}`,
      });
    }
  }

  const betweenMatch = t.match(
    /\bbetween\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s+and\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/
  );
  if (betweenMatch) {
    const startHour = Number(betweenMatch[1]);
    const startMinute = Number(betweenMatch[2] ?? "0");
    const startMeridiem = betweenMatch[3];
    const endHour = Number(betweenMatch[4]);
    const endMinute = Number(betweenMatch[5] ?? "0");
    const endMeridiem = betweenMatch[6];

    const toMinutes = (h: number, m: number, meridiem: string) => {
      const baseHour = h % 12;
      const hour24 = meridiem === "pm" ? baseHour + 12 : baseHour;
      return hour24 * 60 + m;
    };

    if (
      startHour >= 1 &&
      startHour <= 12 &&
      endHour >= 1 &&
      endHour <= 12 &&
      startMinute >= 0 &&
      startMinute <= 59 &&
      endMinute >= 0 &&
      endMinute <= 59
    ) {
      const startMinutes = toMinutes(startHour, startMinute, startMeridiem);
      const endMinutes = toMinutes(endHour, endMinute, endMeridiem);
      if (endMinutes > startMinutes) {
        windows.push({
          startMinutes,
          endMinutes,
          weight: 4,
          label: `${toTimeInput(startMinutes)}-${toTimeInput(endMinutes)}`,
        });
      }
    }
  }

  return windows;
}

export function parseIntakeAvailability(
  availabilityText: string
): ParsedIntakeAvailability {
  const allowedWeekdays = parseAllowedWeekdays(availabilityText);
  const preferredWindows = parsePreferredWindows(availabilityText);

  const windowsOut = preferredWindows.map((window) => ({
    startTime: toTimeInput(window.startMinutes),
    endTime: toTimeInput(window.endMinutes),
    weight: window.weight,
    label: window.label,
  }));

  if (!allowedWeekdays && windowsOut.length === 0) {
    return { source: "none", allowedWeekdays: null, preferredWindows: [] };
  }

  return {
    source: "heuristic",
    allowedWeekdays,
    preferredWindows: windowsOut,
  };
}

function withinWindow(
  startMinutes: number,
  endMinutes: number,
  window: PreferredWindow
): boolean {
  return startMinutes >= window.startMinutes && endMinutes <= window.endMinutes;
}

function computePreferenceBonus(params: {
  startMinutes: number;
  endMinutes: number;
  preferredWindows: PreferredWindow[];
}): number {
  if (params.preferredWindows.length === 0) {
    return 0;
  }

  return params.preferredWindows.reduce((acc, window) => {
    if (withinWindow(params.startMinutes, params.endMinutes, window)) {
      return acc + window.weight;
    }
    return acc;
  }, 0);
}

export function generateSlottingSuggestions(params: {
  intakeAvailabilityText: string;
  operatingHoursRows: OperatingHoursRow[];
  candidateTutorIds: string[];
  existingSessions: SlottingExistingSession[];
  horizonDays: number;
  durationMinutes?: number;
  stepMinutes?: number;
  capacityPerTutorHour?: number;
  limit: number;
  now?: Date;
}): SlottingSuggestionCandidate[] {
  const durationMinutes = params.durationMinutes ?? 60;
  const stepMinutes = params.stepMinutes ?? 60;
  const capacityPerTutorHour = params.capacityPerTutorHour ?? 4;
  const horizonDays = Math.max(1, Math.min(params.horizonDays, 60));
  const limit = Math.max(1, Math.min(params.limit, 200));

  const now = params.now ?? new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const parsedAvailability = parseIntakeAvailability(params.intakeAvailabilityText);
  const allowedWeekdaysSet = parsedAvailability.allowedWeekdays
    ? new Set(parsedAvailability.allowedWeekdays)
    : null;
  const preferredWindows = parsePreferredWindows(params.intakeAvailabilityText);

  const operatingHoursByWeekday = mapOperatingHoursByWeekday(params.operatingHoursRows);

  const existingRangesByTutorDate = new Map<
    string,
    Array<{ startMinutes: number; endMinutes: number }>
  >();

  for (const session of params.existingSessions) {
    if (
      !session.tutorId ||
      !session.sessionDate ||
      !session.startTime ||
      !session.endTime
    ) {
      continue;
    }
    if (session.status === "canceled") {
      continue;
    }
    const startMinutes = parseTimeToMinutes(session.startTime);
    const endMinutes = parseTimeToMinutes(session.endTime);
    if (startMinutes === null || endMinutes === null) {
      continue;
    }

    const key = `${session.tutorId}|${session.sessionDate}`;
    const existing = existingRangesByTutorDate.get(key) ?? [];
    existing.push({ startMinutes, endMinutes });
    existingRangesByTutorDate.set(key, existing);
  }

  const suggestions: SlottingSuggestionCandidate[] = [];

  for (const tutorId of params.candidateTutorIds) {
    if (!tutorId) {
      continue;
    }

    for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
      const dateKey = formatDateKey(addDaysUtc(todayUtc, dayOffset));
      const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();

      if (allowedWeekdaysSet && !allowedWeekdaysSet.has(weekday)) {
        continue;
      }

      const hoursRow = operatingHoursByWeekday[weekday];
      if (!hoursRow) {
        continue;
      }

      const { openMinutes, closeMinutes } = operatingHoursWindowMinutes(hoursRow);
      if (openMinutes === null || closeMinutes === null) {
        continue;
      }

      for (
        let startMinutes = openMinutes;
        startMinutes + durationMinutes <= closeMinutes;
        startMinutes += stepMinutes
      ) {
        const endMinutes = startMinutes + durationMinutes;
        const existingRanges =
          existingRangesByTutorDate.get(`${tutorId}|${dateKey}`) ?? [];
        const overlapCount = existingRanges.filter(
          (range) =>
            startMinutes < range.endMinutes && endMinutes > range.startMinutes
        ).length;

        if (overlapCount >= capacityPerTutorHour) {
          continue;
        }

        const preferenceBonus = computePreferenceBonus({
          startMinutes,
          endMinutes,
          preferredWindows,
        });

        const score =
          10_000 -
          dayOffset * 50 -
          Math.floor(startMinutes / 60) * 5 -
          overlapCount * 25 +
          preferenceBonus * 200;

        const reasons: SlottingSuggestionReasonsV1 = {
          version: 1,
          generated: {
            intakeAvailability: parsedAvailability,
            rules: {
              horizonDays,
              durationMinutes,
              capacityPerTutorHour,
            },
            ranking: {
              dayOffset,
              weekday,
              startMinutes,
              overlapCount,
              preferenceBonus,
              score,
            },
          },
        };

        suggestions.push({
          tutorId,
          sessionDate: dateKey,
          startTime: toTimeInput(startMinutes),
          endTime: toTimeInput(endMinutes),
          score,
          reasons,
        });
      }
    }
  }

  suggestions.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.sessionDate !== b.sessionDate) {
      return a.sessionDate.localeCompare(b.sessionDate);
    }
    if (a.startTime !== b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    if (a.endTime !== b.endTime) {
      return a.endTime.localeCompare(b.endTime);
    }
    return a.tutorId.localeCompare(b.tutorId);
  });

  return suggestions.slice(0, limit);
}
