import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  computeBillingDecision,
  validateMembershipAdjustment,
} from "../../src/lib/membership";

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");

function findVs4Migration(): string | null {
  if (!fs.existsSync(migrationsDir)) {
    return null;
  }

  const files = fs.readdirSync(migrationsDir);
  const matches = files.filter((file) => file.match(/vs4|membership/i));

  if (matches.length === 0) {
    return null;
  }

  matches.sort();
  return path.join(migrationsDir, matches[matches.length - 1]);
}

function readMigration(migrationPath: string) {
  return fs.readFileSync(migrationPath, "utf8");
}

describe("VS4 membership migration coverage", () => {
  const migrationPath = findVs4Migration();
  const run = migrationPath ? it : it.skip;

  run("enforces non-negative hours and adjustment audit columns", () => {
    if (!migrationPath) {
      return;
    }

    const sql = readMigration(migrationPath);

    expect(sql).toMatch(/create table if not exists public\.memberships/i);
    expect(sql).toMatch(/hours_remaining/i);
    expect(sql).toMatch(/check\s*\(\s*hours_remaining\s*>=\s*0/i);

    expect(sql).toMatch(/create table if not exists public\.membership_adjustments/i);
    expect(sql).toMatch(/delta_hours\s+numeric/i);
    expect(sql).toMatch(/reason\s+text/i);
  });

  run("guards idempotent membership billing for sessions", () => {
    if (!migrationPath) {
      return;
    }

    const sql = readMigration(migrationPath);

    const hasBilledFlag = /billed_to_membership\s+boolean/i.test(sql);
    const hasAdjustmentSession =
      /membership_adjustments/i.test(sql) &&
      /session_id/i.test(sql) &&
      (/unique\s*\(\s*(membership_id\s*,\s*)?session_id\s*\)/i.test(sql) ||
        /unique\s+index[\s\S]*session_id/i.test(sql));

    expect(hasBilledFlag || hasAdjustmentSession).toBe(true);
  });
});

describe("VS4 membership adjustment validation", () => {
  it("rejects zero or non-finite adjustments", () => {
    expect(
      validateMembershipAdjustment({ deltaHours: 0, reason: "Fix" })
    ).toBe("Adjustment hours must be a non-zero number.");
    expect(
      validateMembershipAdjustment({ deltaHours: Number.NaN, reason: "Fix" })
    ).toBe("Adjustment hours must be a non-zero number.");
  });

  it("requires a non-empty reason", () => {
    expect(
      validateMembershipAdjustment({ deltaHours: 1, reason: "   " })
    ).toBe("Adjustment reason is required.");
  });

  it("accepts valid adjustments", () => {
    expect(
      validateMembershipAdjustment({ deltaHours: -2, reason: "Makeup" })
    ).toBeNull();
  });
});

describe("VS4 membership billing idempotency", () => {
  it("does not bill unless session is completed", () => {
    expect(
      computeBillingDecision({
        sessionStatus: "scheduled",
        billedToMembership: false,
        hoursRemaining: 4,
      })
    ).toEqual({
      shouldBill: false,
      nextHoursRemaining: 4,
      error: "Session must be completed before billing.",
    });
  });

  it("does not bill twice when already billed", () => {
    expect(
      computeBillingDecision({
        sessionStatus: "completed",
        billedToMembership: true,
        hoursRemaining: 3,
      })
    ).toEqual({
      shouldBill: false,
      nextHoursRemaining: 3,
    });
  });

  it("bills exactly once when completed and hours available", () => {
    expect(
      computeBillingDecision({
        sessionStatus: "completed",
        billedToMembership: false,
        hoursRemaining: 2,
      })
    ).toEqual({
      shouldBill: true,
      nextHoursRemaining: 1,
    });
  });
});
