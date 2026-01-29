import { describe, expect, it } from "vitest";

import {
  calculateLastSessionDelta,
  countLoggedSessions,
  extractLoggedSessionDates,
  parsePercent,
} from "../../src/lib/progress";

describe("parsePercent", () => {
  it("returns null for empty values", () => {
    expect(parsePercent("")).toBeNull();
  });

  it("rejects out of range values", () => {
    expect(parsePercent("-1")).toBeNull();
    expect(parsePercent("101")).toBeNull();
  });

  it("rounds valid percentages", () => {
    expect(parsePercent("92.4")).toBe(92);
    expect(parsePercent("88.8")).toBe(89);
  });
});

describe("countLoggedSessions", () => {
  it("counts sessions with logs", () => {
    const count = countLoggedSessions([
      { session_date: "2026-02-01", session_logs: [{ id: "1" }] },
      { session_date: "2026-02-02", session_logs: null },
      { session_date: "2026-02-03", session_logs: { id: "2" } },
    ]);

    expect(count).toBe(2);
  });
});

describe("extractLoggedSessionDates", () => {
  it("returns unique dates in descending order", () => {
    const dates = extractLoggedSessionDates([
      { session_date: "2026-02-02", session_logs: { id: "1" } },
      { session_date: "2026-02-01", session_logs: { id: "2" } },
      { session_date: "2026-02-02", session_logs: [{ id: "3" }] },
    ]);

    expect(dates).toEqual(["2026-02-02", "2026-02-01"]);
  });
});

describe("calculateLastSessionDelta", () => {
  it("returns day difference between sessions", () => {
    expect(calculateLastSessionDelta("2026-02-10", "2026-02-05")).toBe(5);
  });
});
