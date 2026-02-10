import { describe, expect, it } from "vitest";

import { computeDurationHours, normalizeMonth } from "../../src/lib/reports";

describe("reports helpers", () => {
  describe("normalizeMonth", () => {
    it("returns null for empty input", () => {
      expect(normalizeMonth(undefined)).toBeNull();
      expect(normalizeMonth(null)).toBeNull();
      expect(normalizeMonth("")).toBeNull();
    });

    it("returns null for invalid formats", () => {
      expect(normalizeMonth("2026-2")).toBeNull();
      expect(normalizeMonth("02-2026")).toBeNull();
      expect(normalizeMonth("2026-13")).toBeNull();
      expect(normalizeMonth("abcd-ef")).toBeNull();
    });

    it("returns the YYYY-MM string for valid months", () => {
      expect(normalizeMonth("2026-02")).toBe("2026-02");
      expect(normalizeMonth(["2026-12"])).toBe("2026-12");
    });
  });

  describe("computeDurationHours", () => {
    it("returns 0 when times are missing or invalid", () => {
      expect(computeDurationHours(null, "16:00:00")).toBe(0);
      expect(computeDurationHours("15:00:00", null)).toBe(0);
      expect(computeDurationHours("nope", "16:00:00")).toBe(0);
      expect(computeDurationHours("15:00:00", "nope")).toBe(0);
    });

    it("returns 0 when end <= start", () => {
      expect(computeDurationHours("16:00:00", "15:00:00")).toBe(0);
      expect(computeDurationHours("15:00:00", "15:00:00")).toBe(0);
    });

    it("computes hour deltas", () => {
      expect(computeDurationHours("15:00:00", "16:00:00")).toBe(1);
      expect(computeDurationHours("15:00:00", "17:00:00")).toBe(2);
      expect(computeDurationHours("15:00:00", "16:30:00")).toBe(1.5);
      expect(computeDurationHours("15:00", "16:30")).toBe(1.5);
    });
  });
});

