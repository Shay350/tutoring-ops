import { describe, expect, it } from "vitest";

import { expandWeeklyRecurrence, findOverlap } from "../../src/lib/schedule";

describe("expandWeeklyRecurrence", () => {
  it("returns dates for selected weekdays within range", () => {
    const dates = expandWeeklyRecurrence({
      startDate: "2026-02-02",
      endDate: "2026-02-08",
      weekdays: ["mon", "wed", "fri"],
    });

    expect(dates).toEqual(["2026-02-02", "2026-02-04", "2026-02-06"]);
  });
});

describe("findOverlap", () => {
  it("detects overlap against existing sessions", () => {
    const message = findOverlap(
      [
        {
          session_date: "2026-02-04",
          start_time: "14:00",
          end_time: "15:00",
        },
      ],
      [
        {
          session_date: "2026-02-04",
          start_time: "14:30",
          end_time: "15:30",
        },
      ]
    );

    expect(message).toMatch(/2026-02-04/);
  });

  it("detects overlap inside incoming sessions", () => {
    const message = findOverlap(
      [],
      [
        {
          session_date: "2026-02-05",
          start_time: "09:00",
          end_time: "10:00",
        },
        {
          session_date: "2026-02-05",
          start_time: "09:30",
          end_time: "10:30",
        },
      ]
    );

    expect(message).toMatch(/Overlapping sessions detected/);
  });
});
