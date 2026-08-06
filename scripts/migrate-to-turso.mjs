// One-off migration: copies the local SQLite database (data/dorm.db) into a
// Turso (remote libSQL) database. Safe to re-run — uses INSERT OR REPLACE.
//
// Usage:
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/migrate-to-turso.mjs

import { createClient } from "@libsql/client";
import path from "path";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables first.");
  process.exit(1);
}

const source = createClient({ url: `file:${path.join(process.cwd(), "data", "dorm.db")}` });
const dest = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function ensureSchema() {
  await dest.execute("PRAGMA foreign_keys = ON").catch(() => {});
  await dest.batch(
    [
      `CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        floor TEXT NOT NULL,
        is_owner INTEGER NOT NULL DEFAULT 0,
        default_rent INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        photo_path TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS room_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        note TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS monthly_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        rent INTEGER NOT NULL DEFAULT 0,
        elec_before REAL NOT NULL DEFAULT 0,
        elec_after REAL NOT NULL DEFAULT 0,
        elec_rate REAL NOT NULL DEFAULT 7,
        water_before REAL NOT NULL DEFAULT 0,
        water_after REAL NOT NULL DEFAULT 0,
        water_rate REAL NOT NULL DEFAULT 22,
        payment_status TEXT NOT NULL DEFAULT 'ยังไม่จ่าย',
        payment_date TEXT,
        note TEXT,
        UNIQUE(room_id, year, month)
      )`,
      `CREATE TABLE IF NOT EXISTS monthly_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        water_bill REAL NOT NULL DEFAULT 0,
        electric_bill REAL NOT NULL DEFAULT 0,
        internet_room REAL NOT NULL DEFAULT 0,
        internet_home REAL NOT NULL DEFAULT 0,
        maintenance REAL NOT NULL DEFAULT 0,
        to_father REAL NOT NULL DEFAULT 0,
        to_mother_sibling REAL NOT NULL DEFAULT 0,
        other_expense REAL NOT NULL DEFAULT 0,
        other_note TEXT,
        UNIQUE(year, month)
      )`,
    ],
    "write"
  );
}

async function copyTable(tableName, columns) {
  const result = await source.execute(`SELECT ${columns.join(", ")} FROM ${tableName}`);
  if (result.rows.length === 0) {
    console.log(`${tableName}: 0 rows, skipping`);
    return;
  }
  const placeholders = columns.map((c) => `@${c}`).join(", ");
  const stmts = result.rows.map((row) => {
    const args = {};
    for (const col of columns) args[col] = row[col];
    return {
      sql: `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
      args,
    };
  });
  await dest.batch(stmts, "write");
  console.log(`${tableName}: copied ${result.rows.length} rows`);
}

async function main() {
  await ensureSchema();

  await copyTable("rooms", ["id", "code", "floor", "is_owner", "default_rent", "sort_order", "active", "photo_path"]);
  await copyTable("monthly_records", [
    "id",
    "room_id",
    "year",
    "month",
    "rent",
    "elec_before",
    "elec_after",
    "elec_rate",
    "water_before",
    "water_after",
    "water_rate",
    "payment_status",
    "payment_date",
    "note",
  ]);
  await copyTable("monthly_expenses", [
    "id",
    "year",
    "month",
    "water_bill",
    "electric_bill",
    "internet_room",
    "internet_home",
    "maintenance",
    "to_father",
    "to_mother_sibling",
    "other_expense",
    "other_note",
  ]);
  await copyTable("room_items", ["id", "room_id", "name", "quantity", "note", "sort_order"]);

  console.log("\nVerifying...");
  const [srcRooms, dstRooms] = await Promise.all([
    source.execute("SELECT COUNT(*) as c FROM rooms"),
    dest.execute("SELECT COUNT(*) as c FROM rooms"),
  ]);
  const [srcRecords, dstRecords] = await Promise.all([
    source.execute("SELECT COUNT(*) as c FROM monthly_records"),
    dest.execute("SELECT COUNT(*) as c FROM monthly_records"),
  ]);
  const [srcExpenses, dstExpenses] = await Promise.all([
    source.execute("SELECT COUNT(*) as c FROM monthly_expenses"),
    dest.execute("SELECT COUNT(*) as c FROM monthly_expenses"),
  ]);

  console.log(`rooms: local=${srcRooms.rows[0].c} turso=${dstRooms.rows[0].c}`);
  console.log(`monthly_records: local=${srcRecords.rows[0].c} turso=${dstRecords.rows[0].c}`);
  console.log(`monthly_expenses: local=${srcExpenses.rows[0].c} turso=${dstExpenses.rows[0].c}`);

  const ok =
    Number(srcRooms.rows[0].c) === Number(dstRooms.rows[0].c) &&
    Number(srcRecords.rows[0].c) === Number(dstRecords.rows[0].c) &&
    Number(srcExpenses.rows[0].c) === Number(dstExpenses.rows[0].c);

  console.log(ok ? "\n✓ Migration verified successfully" : "\n✗ Row counts do not match — check output above");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
