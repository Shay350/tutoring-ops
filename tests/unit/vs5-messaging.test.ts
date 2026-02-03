import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

import { isThreadUnread } from "../../src/lib/messaging";

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");

function findVs5Migrations(): string[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.match(/vs5.*messaging/i))
    .map((file) => path.join(migrationsDir, file));
}

function readMigrations(paths: string[]) {
  return paths.map((migrationPath) => fs.readFileSync(migrationPath, "utf8")).join("\n");
}

describe("VS5 messaging migration coverage", () => {
  const migrationPaths = findVs5Migrations();
  const run = migrationPaths.length > 0 ? it : it.skip;

  run("defines message tables and RLS policies", () => {
    const sql = readMigrations(migrationPaths);

    expect(sql).toMatch(/create table if not exists public\.message_threads/i);
    expect(sql).toMatch(/create table if not exists public\.messages/i);
    expect(sql).toMatch(/create table if not exists public\.message_read_state/i);

    expect(sql).toMatch(/Customers can read own message threads/i);
    expect(sql).toMatch(/Customers can insert message threads/i);
    expect(sql).toMatch(/Customers can read messages in own threads/i);
    expect(sql).toMatch(/Customers can insert messages in own threads/i);
    expect(sql).toMatch(/Customers can update own message read state/i);

    expect(sql).toMatch(/Managers can read all message threads/i);
    expect(sql).toMatch(/Managers can insert messages/i);
  });
});

describe("VS5 unread computation", () => {
  it("returns false when no messages exist", () => {
    expect(isThreadUnread({ lastMessageAt: null, lastReadAt: null })).toBe(false);
  });

  it("returns true when last message is after last read", () => {
    expect(
      isThreadUnread({
        lastMessageAt: "2026-02-01T12:00:00Z",
        lastReadAt: "2026-02-01T11:59:00Z",
      })
    ).toBe(true);
  });

  it("returns false when last read is after last message", () => {
    expect(
      isThreadUnread({
        lastMessageAt: "2026-02-01T11:00:00Z",
        lastReadAt: "2026-02-01T11:30:00Z",
      })
    ).toBe(false);
  });

  it("returns true when messages exist but read state missing", () => {
    expect(
      isThreadUnread({
        lastMessageAt: "2026-02-01T11:00:00Z",
        lastReadAt: null,
      })
    ).toBe(true);
  });

  it("handles invalid timestamps safely", () => {
    expect(
      isThreadUnread({ lastMessageAt: "invalid", lastReadAt: "invalid" })
    ).toBe(false);
  });
});
