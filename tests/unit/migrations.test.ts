import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260129000000_vs1_core.sql"
);

function readMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

describe("VS1 migration coverage", () => {
  it("defines required intake fields and status validation", () => {
    const sql = readMigration();

    expect(sql).toMatch(/create table if not exists public\.intakes/i);
    expect(sql).toMatch(/customer_id uuid not null/i);
    expect(sql).toMatch(/student_name text not null/i);
    expect(sql).toMatch(/subjects text\[\] not null default '\{\}'/i);
    expect(sql).toMatch(
      /status text not null default 'submitted' check \(status in \('submitted', 'approved', 'rejected'\)\)/i
    );
  });

  it("enforces session log policies for manager, customer, and tutor", () => {
    const sql = readMigration();

    expect(sql).toMatch(/create table if not exists public\.session_logs/i);
    expect(sql).toMatch(/unique \(session_id\)/i);

    expect(sql).toMatch(/Managers can read all session logs/i);
    expect(sql).toMatch(/Customers can read own session logs/i);
    expect(sql).toMatch(/Tutors can create session logs for assigned students/i);
    expect(sql).toMatch(/Tutors can update session logs for assigned students/i);
    expect(sql).toMatch(/Tutors can read session logs for assigned students/i);
  });
});
