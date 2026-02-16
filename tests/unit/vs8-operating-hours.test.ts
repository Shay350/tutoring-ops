import { describe, expect, it } from "vitest";

import {
  isTimeRangeWithinOperatingHours,
  mapOperatingHoursByWeekday,
  normalizeOperatingHours,
  operatingHoursWindowMinutes,
  weekdayFromDateKey,
} from "../../src/lib/operating-hours";
import { formatMinutesToTimeLabel } from "../../src/lib/schedule";

describe("normalizeOperatingHours", () => {
  it("fills missing weekdays with defaults", () => {
    const normalized = normalizeOperatingHours([
      { weekday: 1, is_closed: false, open_time: "10:00", close_time: "18:00" },
    ]);

    expect(normalized).toHaveLength(7);
    expect(normalized.find((row) => row.weekday === 1)).toMatchObject({
      weekday: 1,
      is_closed: false,
      open_time: "10:00",
      close_time: "18:00",
    });
    expect(normalized.find((row) => row.weekday === 0)?.is_closed).toBe(true);
    expect(normalized.find((row) => row.weekday === 6)?.is_closed).toBe(true);
  });
});

describe("operatingHoursWindowMinutes", () => {
  it("returns null window for closed day", () => {
    expect(
      operatingHoursWindowMinutes({
        weekday: 0,
        is_closed: true,
        open_time: null,
        close_time: null,
      })
    ).toEqual({ openMinutes: null, closeMinutes: null });
  });

  it("returns null window for invalid times", () => {
    expect(
      operatingHoursWindowMinutes({
        weekday: 1,
        is_closed: false,
        open_time: "17:00",
        close_time: "09:00",
      })
    ).toEqual({ openMinutes: null, closeMinutes: null });
  });

  it("returns minutes window for open day", () => {
    expect(
      operatingHoursWindowMinutes({
        weekday: 2,
        is_closed: false,
        open_time: "09:30",
        close_time: "17:00",
      })
    ).toEqual({ openMinutes: 570, closeMinutes: 1020 });
  });
});

describe("formatMinutesToTimeLabel", () => {
  it("formats AM/PM correctly", () => {
    expect(formatMinutesToTimeLabel(0)).toBe("12:00 AM");
    expect(formatMinutesToTimeLabel(9 * 60)).toBe("9:00 AM");
    expect(formatMinutesToTimeLabel(12 * 60)).toBe("12:00 PM");
    expect(formatMinutesToTimeLabel(13 * 60 + 5)).toBe("1:05 PM");
  });
});

describe("VS8 schedule helpers", () => {
  it("maps operating hours by weekday", () => {
    const map = mapOperatingHoursByWeekday(
      normalizeOperatingHours([
        { weekday: 1, is_closed: false, open_time: "10:00", close_time: "18:00" },
      ])
    );
    expect(map[1]?.open_time).toBe("10:00");
    expect(map[0]?.is_closed).toBe(true);
  });

  it("validates time ranges against operating hours", () => {
    const monday = {
      weekday: 1,
      is_closed: false,
      open_time: "09:00",
      close_time: "17:00",
    };
    expect(isTimeRangeWithinOperatingHours(monday, "09:00", "10:00")).toBe(true);
    expect(isTimeRangeWithinOperatingHours(monday, "08:30", "10:00")).toBe(false);
    expect(isTimeRangeWithinOperatingHours(monday, "16:30", "17:30")).toBe(false);
  });

  it("derives weekday from date key", () => {
    expect(weekdayFromDateKey("2026-02-16")).toBe(1);
    expect(weekdayFromDateKey("invalid")).toBe(null);
  });
});
