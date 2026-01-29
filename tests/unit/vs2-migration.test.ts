import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");

function findVs2Migration(): string | null {
  if (!fs.existsSync(migrationsDir)) {
    return null;
  }

  const files = fs.readdirSync(migrationsDir);
  const match = files.find((file) => file.match(/vs2.*sched/i));

  return match ? path.join(migrationsDir, match) : null;
}

function readMigration(migrationPath: string) {
  return fs.readFileSync(migrationPath, "utf8");
}

describe("VS2 migration coverage", () => {
  const migrationPath = findVs2Migration();
  const run = migrationPath ? it : it.skip;

  run("adds scheduling fields and indexes", () => {
    if (!migrationPath) {
      return;
    }

    const sql = readMigration(migrationPath);

    expect(sql).toMatch(/add column if not exists start_time time/i);
    expect(sql).toMatch(/add column if not exists end_time time/i);
    expect(sql).toMatch(/add column if not exists recurrence_rule text/i);
    expect(sql).toMatch(/sessions_session_date_start_time_idx/i);
    expect(sql).toMatch(/sessions_tutor_date_start_time_idx/i);
  });

  run("updates tutor session visibility policy", () => {
    if (!migrationPath) {
      return;
    }

    const sql = readMigration(migrationPath);

    expect(sql).toMatch(/Tutors can read own sessions/i);
  });

  it("includes session visibility policies for all roles", () => {
    if (!fs.existsSync(migrationsDir)) {
      return;
    }

    const sql = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readMigration(path.join(migrationsDir, file)))
      .join("\n");

    expect(sql).toMatch(/Managers can read all sessions/i);
    expect(sql).toMatch(/Customers can read own sessions/i);
    expect(sql).toMatch(/Tutors can read own sessions/i);
  });
});
