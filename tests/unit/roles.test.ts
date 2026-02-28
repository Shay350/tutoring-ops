import { describe, expect, it } from "vitest";
import { resolveRolePath, roleToPath } from "../../src/lib/roles";

describe("roleToPath", () => {
  it("maps admin to /admin", () => {
    expect(roleToPath("admin")).toBe("/admin");
  });

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

describe("resolveRolePath", () => {
  it("returns /login for unknown role", () => {
    expect(resolveRolePath("unknown")).toBe("/login");
  });

  it("returns /login for missing role", () => {
    expect(resolveRolePath(undefined)).toBe("/login");
  });

  it("supports a custom fallback", () => {
    expect(resolveRolePath("unknown", "/")).toBe("/");
  });
});
