import { describe, expect, it } from "vitest";

import { isProfileBlocked } from "../../src/lib/auth-utils";

describe("isProfileBlocked", () => {
  it("returns true when pending is true", () => {
    expect(isProfileBlocked({ pending: true })).toBe(true);
  });

  it("returns false when pending is false", () => {
    expect(isProfileBlocked({ pending: false })).toBe(false);
  });

  it("returns false for missing profile", () => {
    expect(isProfileBlocked(null)).toBe(false);
  });
});
