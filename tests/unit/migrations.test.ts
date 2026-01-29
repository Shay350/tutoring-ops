import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");

function findVs1Migration(): string | null {
  if (!fs.existsSync(migrationsDir)) {
    return null;
  }

  const files = fs.readdirSync(migrationsDir);
  const match = files.find((file) => file.match(/vs1.*core/i));

  return match ? path.join(migrationsDir, match) : null;
}

function readMigration(migrationPath: string) {
  return fs.readFileSync(migrationPath, "utf8");
}

describe("VS1 migration coverage", () => {
  const migrationPath = findVs1Migration();
  const run = migrationPath ? it : it.skip;

  run("defines required intake fields and status validation", () => {
    if (!migrationPath) {
      return;
    }

    const sql = readMigration(migrationPath);

    expect(sql).toMatch(/create table if not exists public\.intakes/i);
    expect(sql).toMatch(/customer_id uuid not null/i);
    expect(sql).toMatch(/student_name text not null/i);
    expect(sql).toMatch(/subjects text\[\] not null default '\{\}'/i);
    expect(sql).toMatch(
      /status text not null default 'submitted' check \(status in \('submitted', 'approved', 'rejected'\)\)/i
    );
  });

  run("enforces session log policies for manager, customer, and tutor", () => {
    if (!migrationPath) {
      return;
    }

    const sql = readMigration(migrationPath);

    expect(sql).toMatch(/create table if not exists public\.session_logs/i);
    expect(sql).toMatch(/unique \(session_id\)/i);

    expect(sql).toMatch(/Managers can read all session logs/i);
    expect(sql).toMatch(/Customers can read own session logs/i);
    expect(sql).toMatch(/Tutors can create session logs for assigned students/i);
    expect(sql).toMatch(/Tutors can update session logs for assigned students/i);
    expect(sql).toMatch(/Tutors can read session logs for assigned students/i);
  });
});
