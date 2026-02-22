import { describe, expect, it } from "vitest";

import { formatSlottingReasons } from "../../src/lib/slotting-reasons";

describe("slotting reasons formatter", () => {
  it("renders deterministic lines from generated reasons payload", () => {
    const formatted = formatSlottingReasons({
      version: 1,
      generated: {
        intakeAvailability: {
          source: "heuristic",
          allowedWeekdays: [1, 3],
          preferredWindows: [
            {
              startTime: "17:00",
              endTime: "20:00",
              weight: 2,
              label: "evening",
            },
          ],
        },
        rules: {
          horizonDays: 14,
          durationMinutes: 60,
          capacityPerTutorHour: 4,
        },
        ranking: {
          dayOffset: 2,
          weekday: 3,
          startMinutes: 1080,
          overlapCount: 1,
          preferenceBonus: 2,
          score: 95,
        },
      },
    });

    expect(formatted.summary).toContain("Score 95");
    expect(formatted.summary).toContain("Wed 18:00");
    expect(formatted.lines).toContain("Availability parse: heuristic");
    expect(formatted.lines).toContain("Allowed weekdays: Mon, Wed");
    expect(
      formatted.lines.some((line) =>
        line.startsWith("Preferred windows: evening 17:00-20:00 w=2")
      )
    ).toBe(true);
    expect(formatted.lines).toContain("Tutor overlap: 1/4");
  });
});

