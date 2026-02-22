import { describe, expect, it } from "vitest";

import type { OperatingHoursRow } from "../../src/lib/operating-hours";
import type { SlottingExistingSession } from "../../src/lib/vs9-slotting";
import { generateSlottingSuggestions } from "../../src/lib/vs9-slotting";

function hoursRow(params: {
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}): OperatingHoursRow {
  return {
    weekday: params.weekday,
    is_closed: params.is_closed,
    open_time: params.open_time,
    close_time: params.close_time,
  };
}

describe("VS9 generator ranking + edge cases", () => {
  it("ranks preferred windows above non-preferred times", () => {
    const operatingHoursRows: OperatingHoursRow[] = [
      hoursRow({ weekday: 1, is_closed: false, open_time: "09:00", close_time: "20:00" }),
    ];

    const suggestions = generateSlottingSuggestions({
      intakeAvailabilityText: "Weekdays after 6pm",
      operatingHoursRows,
      candidateTutorIds: ["tutor-1"],
      existingSessions: [],
      horizonDays: 1,
      capacityPerTutorHour: 4,
      limit: 50,
      now: new Date("2026-02-16T12:00:00Z"), // Monday
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].sessionDate).toBe("2026-02-16");
    expect(suggestions[0].startTime).toBe("18:00");
  });

  it("skips closed operating-hour days", () => {
    const operatingHoursRows: OperatingHoursRow[] = [
      hoursRow({ weekday: 0, is_closed: true, open_time: null, close_time: null }),
    ];

    const suggestions = generateSlottingSuggestions({
      intakeAvailabilityText: "Weekends",
      operatingHoursRows,
      candidateTutorIds: ["tutor-1"],
      existingSessions: [],
      horizonDays: 1,
      capacityPerTutorHour: 4,
      limit: 50,
      now: new Date("2026-02-22T12:00:00Z"), // Sunday
    });

    expect(suggestions).toEqual([]);
  });

  it("skips slots at full tutor-hour capacity", () => {
    const operatingHoursRows: OperatingHoursRow[] = [
      hoursRow({ weekday: 2, is_closed: false, open_time: "09:00", close_time: "10:00" }),
    ];

    const existingSessions: SlottingExistingSession[] = Array.from({ length: 4 }, () => ({
      tutorId: "tutor-1",
      sessionDate: "2026-02-17",
      startTime: "09:00",
      endTime: "10:00",
      status: "scheduled",
    }));

    const suggestions = generateSlottingSuggestions({
      intakeAvailabilityText: "Tuesdays",
      operatingHoursRows,
      candidateTutorIds: ["tutor-1"],
      existingSessions,
      horizonDays: 1,
      capacityPerTutorHour: 4,
      limit: 50,
      now: new Date("2026-02-17T12:00:00Z"), // Tuesday
    });

    expect(suggestions).toEqual([]);
  });

  it("respects availability weekday constraints", () => {
    const operatingHoursRows: OperatingHoursRow[] = [
      hoursRow({ weekday: 1, is_closed: false, open_time: "09:00", close_time: "10:00" }),
      hoursRow({ weekday: 6, is_closed: false, open_time: "09:00", close_time: "10:00" }),
    ];

    const suggestions = generateSlottingSuggestions({
      intakeAvailabilityText: "Weekends",
      operatingHoursRows,
      candidateTutorIds: ["tutor-1"],
      existingSessions: [],
      horizonDays: 7,
      capacityPerTutorHour: 4,
      limit: 50,
      now: new Date("2026-02-16T12:00:00Z"), // Monday
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(
      suggestions.every((s) => {
        const weekday = new Date(`${s.sessionDate}T00:00:00Z`).getUTCDay();
        return weekday === 0 || weekday === 6;
      })
    ).toBe(true);
  });
});

