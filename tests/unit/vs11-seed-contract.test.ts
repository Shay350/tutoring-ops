import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function parseCsv(filePath: string): Array<Record<string, string>> {
  const text = fs.readFileSync(filePath, "utf8").trim();
  const [headerLine, ...rows] = text.split(/\r?\n/);
  const headers = headerLine.split(",");
  return rows.map((line) => {
    const cols = line.split(",");
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = cols[index] ?? "";
      return acc;
    }, {});
  });
}

describe("VS11 seed contract", () => {
  it("includes deterministic actors for admin-governance and membership scenarios", () => {
    const profilesPath = path.join(process.cwd(), "seed", "profiles_seed.csv");
    const profiles = parseCsv(profilesPath);

    const admins = profiles.filter((profile) => profile.role === "admin" && profile.pending === "false");
    expect(admins.length).toBeGreaterThanOrEqual(2);

    const adminEmailSet = new Set(admins.map((profile) => profile.email));
    expect(adminEmailSet.has("admin@tutorops.local")).toBe(true);
    expect(adminEmailSet.has("admin2@tutorops.local")).toBe(true);

    const manager = profiles.find((profile) => profile.email === "manager@tutorops.local");
    expect(manager?.role).toBe("manager");

    const customer = profiles.find((profile) => profile.email === "parent1@tutorops.local");
    expect(customer?.role).toBe("customer");
  });
});
