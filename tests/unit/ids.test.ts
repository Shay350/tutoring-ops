import { describe, expect, it } from "vitest";

import {
  deriveShortCodeCandidates,
  isUuid,
  normalizeShortCode,
} from "../../src/lib/ids";

describe("id helpers", () => {
  it("detects UUID values", () => {
    expect(isUuid("20000000-0000-0000-0000-000000000003")).toBe(true);
    expect(isUuid("INT-1003")).toBe(false);
    expect(isUuid("")).toBe(false);
  });

  it("normalizes short codes", () => {
    expect(normalizeShortCode("  int-1003  ")).toBe("INT-1003");
    expect(normalizeShortCode(null)).toBe("");
  });

  it("derives intake short code candidates from route params", () => {
    expect(deriveShortCodeCandidates("INT-1003")).toEqual(["INT-1003"]);
    expect(deriveShortCodeCandidates("int-1003Manager")).toEqual([
      "INT-1003MANAGER",
      "INT-1003",
    ]);
    expect(deriveShortCodeCandidates(" int-1003 manager ")).toEqual([
      "INT-1003MANAGER",
      "INT-1003",
    ]);
    expect(deriveShortCodeCandidates("")).toEqual([]);
  });
});
