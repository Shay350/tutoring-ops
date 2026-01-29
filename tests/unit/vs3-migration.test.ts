import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");

function findVs3Migration(): string | null {
  if (!fs.existsSync(migrationsDir)) {
    return null;
  }

  const files = fs.readdirSync(migrationsDir);
  const match = files.find((file) => file.match(/vs3.*progress/i));

  return match ? path.join(migrationsDir, match) : null;
}

function readMigration(migrationPath: string) {
  return fs.readFileSync(migrationPath, "utf8");
}

describe("VS3 migration coverage", () => {
  const migrationPath = findVs3Migration();
  const run = migrationPath ? it : it.skip;

  run("adds progress snapshot fields and at-risk columns", () => {
    if (!migrationPath) {
      return;
    }

    const sql = readMigration(migrationPath);

    expect(sql).toMatch(/add column if not exists attendance_rate/i);
    expect(sql).toMatch(/add column if not exists homework_completion/i);
    expect(sql).toMatch(/add column if not exists last_session_delta/i);
    expect(sql).toMatch(/add column if not exists updated_at/i);
    expect(sql).toMatch(/add column if not exists at_risk boolean/i);
    expect(sql).toMatch(/add column if not exists at_risk_reason/i);
  });

  run("adds tutor progress snapshot policies and manager student updates", () => {
    if (!migrationPath) {
      return;
    }

    const sql = readMigration(migrationPath);

    expect(sql).toMatch(/Managers can update students/i);
    expect(sql).toMatch(/Tutors can read progress snapshots/i);
    expect(sql).toMatch(/Tutors can create progress snapshots/i);
    expect(sql).toMatch(/Tutors can update progress snapshots/i);
  });
});
