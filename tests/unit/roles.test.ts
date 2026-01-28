import { describe, expect, it } from "vitest";
import { roleToPath } from "../../src/lib/roles";

describe("roleToPath", () => {
  it("maps customer to /customer", () => {
    expect(roleToPath("customer")).toBe("/customer");
  });

  it("maps tutor to /tutor", () => {
    expect(roleToPath("tutor")).toBe("/tutor");
  });

  it("maps manager to /manager", () => {
    expect(roleToPath("manager")).toBe("/manager");
  });
});
