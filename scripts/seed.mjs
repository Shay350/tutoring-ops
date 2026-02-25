import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const PROJECT_ROOT = process.cwd();
const SEED_DIR = path.join(PROJECT_ROOT, "seed");

function loadEnvFile(filePath) {
  return fs
    .readFile(filePath, "utf8")
    .then((contents) => {
      contents.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return;
        }
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) {
          return;
        }
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if (!key || process.env[key]) {
          return;
        }
        if (
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      });
    })
    .catch(() => undefined);
}

async function loadEnv() {
  await loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));
  await loadEnvFile(path.join(PROJECT_ROOT, ".env"));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headerRow, ...dataRows] = rows.filter((data) =>
    data.some((value) => value.trim() !== "")
  );

  if (!headerRow) {
    return [];
  }

  return dataRows.map((data) => {
    const record = {};
    headerRow.forEach((header, index) => {
      const value = data[index] ?? "";
      const trimmed = value.trim();
      if (trimmed === "") {
        record[header] = null;
      } else if (trimmed === "true") {
        record[header] = true;
      } else if (trimmed === "false") {
        record[header] = false;
      } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const inner = trimmed.slice(1, -1);
        record[header] = inner
          ? inner.split(",").map((item) => item.trim())
          : [];
      } else {
        record[header] = value;
      }
    });
    return record;
  });
}

async function readSeedFile(filename) {
  const filePath = path.join(SEED_DIR, filename);
  const contents = await fs.readFile(filePath, "utf8");
  return parseCsv(contents);
}

async function upsertRows(supabase, table, rows, onConflict = "id") {
  if (!rows.length) {
    console.log(`${table}: 0 rows (skipped)`);
    return;
  }

  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict, returning: "minimal" });

  if (error) {
    throw new Error(`Failed to seed ${table}: ${error.message}`);
  }

  console.log(`${table}: ${rows.length} rows`);
}

async function listAllAuthUsers(supabase) {
  const users = [];
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    users.push(...(data?.users ?? []));

    if (!data?.nextPage) {
      break;
    }

    page = data.nextPage;
  }

  return users;
}

async function ensureAuthUsers(supabase, profiles, defaultPassword) {
  let created = 0;
  let updated = 0;
  const normalizeEmail = (value) => (value ?? "").trim().toLowerCase();
  const users = await listAllAuthUsers(supabase);
  const usersByEmail = new Map(
    users
      .filter((user) => Boolean(user.email))
      .map((user) => [normalizeEmail(user.email), user])
  );

  for (const profile of profiles) {
    if (!profile.id || !profile.email) {
      throw new Error("profiles_seed.csv must include id and email.");
    }

    const lookup = await supabase.auth.admin.getUserById(profile.id);
    const existing = lookup.data?.user ?? null;
    const emailKey = normalizeEmail(profile.email);

    if (existing) {
      const existingEmail = normalizeEmail(existing.email);

      if (existingEmail !== emailKey) {
        const existingByEmail = usersByEmail.get(emailKey) ?? null;

        if (existingByEmail && existingByEmail.id !== existing.id) {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(
            existingByEmail.id
          );

          if (deleteError) {
            throw new Error(
              `Failed to delete auth user ${profile.email}: ${deleteError.message}`
            );
          }

          usersByEmail.delete(emailKey);
        }
        if (existingEmail) {
          usersByEmail.delete(existingEmail);
        }
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          email: profile.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: profile.full_name ?? null,
          },
          app_metadata: {
            role: profile.role ?? null,
          },
        }
      );

      if (updateError) {
        throw new Error(
          `Failed to update auth user ${profile.email}: ${updateError.message}`
        );
      }

      updated += 1;
      usersByEmail.set(emailKey, {
        id: existing.id,
        email: profile.email,
      });
      continue;
    }

    const existingByEmail = usersByEmail.get(emailKey) ?? null;

    if (existingByEmail && existingByEmail.id !== profile.id) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        existingByEmail.id
      );

      if (deleteError) {
        throw new Error(
          `Failed to delete auth user ${profile.email}: ${deleteError.message}`
        );
      }

      usersByEmail.delete(emailKey);
    }

    const { error } = await supabase.auth.admin.createUser({
      id: profile.id,
      email: profile.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name ?? null,
      },
      app_metadata: {
        role: profile.role ?? null,
      },
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        const refreshedUsers = await listAllAuthUsers(supabase);
        const refreshedByEmail = new Map(
          refreshedUsers
            .filter((user) => Boolean(user.email))
            .map((user) => [normalizeEmail(user.email), user])
        );
        const conflicting = refreshedByEmail.get(emailKey) ?? null;

        if (conflicting && conflicting.id !== profile.id) {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(
            conflicting.id
          );

          if (deleteError) {
            throw new Error(
              `Failed to delete auth user ${profile.email}: ${deleteError.message}`
            );
          }

          const { error: retryError } = await supabase.auth.admin.createUser({
            id: profile.id,
            email: profile.email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
              full_name: profile.full_name ?? null,
            },
            app_metadata: {
              role: profile.role ?? null,
            },
          });

          if (retryError) {
            throw new Error(
              `Failed to create auth user ${profile.email}: ${retryError.message}`
            );
          }

          created += 1;
          usersByEmail.set(emailKey, { id: profile.id, email: profile.email });
          continue;
        }
      }

      throw new Error(
        `Failed to create auth user ${profile.email}: ${error.message}`
      );
    }

    created += 1;
    usersByEmail.set(emailKey, { id: profile.id, email: profile.email });
  }

  console.log(`auth.users: ${created} created, ${updated} updated`);
}

async function main() {
  await loadEnv();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "Password123!";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing SUPABASE URL or service role key. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const profiles = await readSeedFile("profiles_seed.csv");
  await ensureAuthUsers(supabase, profiles, defaultPassword);
  await upsertRows(supabase, "profiles", profiles);

  await upsertRows(
    supabase,
    "invites",
    await readSeedFile("invites_seed.csv"),
    "email"
  );
  await upsertRows(
    supabase,
    "intakes",
    await readSeedFile("intakes_seed.csv")
  );
  await upsertRows(
    supabase,
    "students",
    await readSeedFile("students_seed.csv")
  );
  await upsertRows(
    supabase,
    "assignments",
    await readSeedFile("assignments_seed.csv")
  );
  await upsertRows(
    supabase,
    "sessions",
    await readSeedFile("sessions_seed.csv")
  );
  await upsertRows(
    supabase,
    "session_logs",
    await readSeedFile("session_logs_seed.csv")
  );
  await upsertRows(
    supabase,
    "progress_snapshots",
    await readSeedFile("progress_snapshots_seed.csv")
  );
  await upsertRows(
    supabase,
    "memberships",
    await readSeedFile("memberships_seed.csv")
  );
  await upsertRows(
    supabase,
    "membership_adjustments",
    await readSeedFile("membership_adjustments_seed.csv")
  );
  const { data: defaultLocationId, error: defaultLocationError } =
    await supabase.rpc("default_location_id");
  if (defaultLocationError || !defaultLocationId) {
    throw new Error(
      "Unable to seed operating hours: default location missing. Apply the VS10 migration."
    );
  }

  const operatingHoursSeed = await readSeedFile("operating_hours_seed.csv");
  const operatingHoursWithLocation = operatingHoursSeed.map((row) => ({
    ...row,
    location_id: defaultLocationId,
  }));

  await upsertRows(
    supabase,
    "operating_hours",
    operatingHoursWithLocation,
    "location_id,weekday"
  );
  await upsertRows(
    supabase,
    "message_threads",
    await readSeedFile("message_threads_seed.csv")
  );
  await upsertRows(supabase, "messages", await readSeedFile("messages_seed.csv"));
  await upsertRows(
    supabase,
    "message_read_state",
    await readSeedFile("message_read_state_seed.csv")
  );
  await upsertRows(
    supabase,
    "message_threads",
    await readSeedFile("message_threads_seed.csv")
  );

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
