import { createClient, type Client, type Row } from "@libsql/client";
import fs from "fs";
import path from "path";
import type { MonthlyExpense, MonthlyRecord, PaymentStatus, Room, RoomItem, RoomRecord, RoomWithItems } from "./types";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "dorm.db");

if (!TURSO_URL) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const client: Client = createClient(
  TURSO_URL ? { url: TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN } : { url: `file:${DB_PATH}` }
);

function rowToObject<T>(row: Row, columns: string[]): T {
  const obj: Record<string, unknown> = {};
  for (const col of columns) obj[col] = row[col];
  return obj as T;
}
function rowsToObjects<T>(result: { rows: Row[]; columns: string[] }): T[] {
  return result.rows.map((r) => rowToObject<T>(r, result.columns));
}

let readyPromise: Promise<void> | null = null;
function ready(): Promise<void> {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

async function init(): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON").catch(() => {});

  await client.batch(
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

  const roomColumns = await client.execute("PRAGMA table_info(rooms)");
  const hasPhotoPath = roomColumns.rows.some((r) => r.name === "photo_path");
  if (!hasPhotoPath) {
    await client.execute("ALTER TABLE rooms ADD COLUMN photo_path TEXT");
  }

  const countResult = await client.execute("SELECT COUNT(*) as c FROM rooms");
  const count = Number(countResult.rows[0].c);
  if (count === 0) {
    const seed: Array<[string, string, number, number, number]> = [
      ["F1", "F", 1, 0, 1],
      ["F2", "F", 0, 1700, 2],
      ["F3", "F", 0, 1500, 3],
      ["F4", "F", 0, 1500, 4],
      ["F5", "F", 0, 0, 5],
      ["F6", "F", 0, 1700, 6],
      ["F7", "F", 0, 1600, 7],
      ["L1", "L", 0, 1800, 8],
      ["L2", "L", 0, 0, 9],
      ["L3", "L", 0, 1600, 10],
      ["L4", "L", 0, 1700, 11],
      ["L5", "L", 0, 1600, 12],
      ["L6", "L", 0, 2100, 13],
      ["L7", "L", 0, 0, 14],
    ];
    await client.batch(
      seed.map(([code, floor, isOwner, rent, order]) => ({
        sql: "INSERT INTO rooms (code, floor, is_owner, default_rent, sort_order, active) VALUES (?, ?, ?, ?, ?, 1)",
        args: [code, floor, isOwner, rent, order],
      })),
      "write"
    );
  }
}

// ---------- Rooms ----------

export async function listRooms(includeInactive = true): Promise<Room[]> {
  await ready();
  const sql = includeInactive
    ? "SELECT * FROM rooms ORDER BY sort_order ASC"
    : "SELECT * FROM rooms WHERE active = 1 ORDER BY sort_order ASC";
  const result = await client.execute(sql);
  return rowsToObjects<Room>(result);
}

export async function createRoom(input: Partial<Room>): Promise<Room> {
  await ready();
  const maxOrderResult = await client.execute("SELECT MAX(sort_order) as m FROM rooms");
  const maxOrder = Number(maxOrderResult.rows[0].m) || 0;
  const info = await client.execute({
    sql: `INSERT INTO rooms (code, floor, is_owner, default_rent, sort_order, active)
          VALUES (@code, @floor, @is_owner, @default_rent, @sort_order, @active)`,
    args: {
      code: input.code || `ROOM${maxOrder + 1}`,
      floor: input.floor || "F",
      is_owner: input.is_owner ? 1 : 0,
      default_rent: input.default_rent ?? 0,
      sort_order: input.sort_order ?? maxOrder + 1,
      active: input.active ?? 1,
    },
  });
  const result = await client.execute({ sql: "SELECT * FROM rooms WHERE id = ?", args: [Number(info.lastInsertRowid)] });
  return rowToObject<Room>(result.rows[0], result.columns);
}

export async function updateRoom(id: number, patch: Partial<Room>): Promise<Room> {
  await ready();
  const currentResult = await client.execute({ sql: "SELECT * FROM rooms WHERE id = ?", args: [id] });
  if (currentResult.rows.length === 0) throw new Error("Room not found");
  const current = rowToObject<Room>(currentResult.rows[0], currentResult.columns);
  const next: Room = { ...current, ...patch, id };
  await client.execute({
    sql: `UPDATE rooms SET code=@code, floor=@floor, is_owner=@is_owner, default_rent=@default_rent,
          sort_order=@sort_order, active=@active WHERE id=@id`,
    args: {
      id: next.id,
      code: next.code,
      floor: next.floor,
      is_owner: next.is_owner,
      default_rent: next.default_rent,
      sort_order: next.sort_order,
      active: next.active,
    },
  });
  const result = await client.execute({ sql: "SELECT * FROM rooms WHERE id = ?", args: [id] });
  return rowToObject<Room>(result.rows[0], result.columns);
}

export async function deleteRoom(id: number): Promise<void> {
  await ready();
  await client.execute({ sql: "DELETE FROM rooms WHERE id = ?", args: [id] });
}

// ---------- Monthly records ----------

async function findPrevReadings(roomId: number, year: number, month: number) {
  let py = year;
  let pm = month - 1;
  if (pm < 1) {
    pm = 12;
    py = year - 1;
  }
  const result = await client.execute({
    sql: "SELECT elec_after, water_after FROM monthly_records WHERE room_id=? AND year=? AND month=?",
    args: [roomId, py, pm],
  });
  if (result.rows.length === 0) return { elec_after: 0, water_after: 0 };
  const row = rowToObject<{ elec_after: number; water_after: number }>(result.rows[0], result.columns);
  return row;
}

export async function ensureMonthRecords(year: number, month: number): Promise<void> {
  await ready();
  const roomsResult = await client.execute("SELECT * FROM rooms WHERE active = 1 ORDER BY sort_order ASC");
  const rooms = rowsToObjects<Room>(roomsResult);

  const existingResult = await client.execute({
    sql: "SELECT room_id FROM monthly_records WHERE year=? AND month=?",
    args: [year, month],
  });
  const existingIds = new Set(existingResult.rows.map((r) => Number(r.room_id)));

  const missing = rooms.filter((room) => !existingIds.has(room.id));
  if (missing.length > 0) {
    const stmts = await Promise.all(
      missing.map(async (room) => {
        const prev = await findPrevReadings(room.id, year, month);
        return {
          sql: `INSERT OR IGNORE INTO monthly_records
                (room_id, year, month, rent, elec_before, elec_after, elec_rate, water_before, water_after, water_rate, payment_status, payment_date, note)
              VALUES
                (@room_id, @year, @month, @rent, @elec_before, @elec_after, @elec_rate, @water_before, @water_after, @water_rate, @payment_status, NULL, NULL)`,
          args: {
            room_id: room.id,
            year,
            month,
            rent: room.default_rent,
            elec_before: prev.elec_after,
            elec_after: prev.elec_after,
            elec_rate: 7,
            water_before: prev.water_after,
            water_after: prev.water_after,
            water_rate: 22,
            payment_status: room.is_owner ? "ไม่มีผู้เช่า" : "ยังไม่จ่าย",
          },
        };
      })
    );
    await client.batch(stmts, "write");
  }

  const expenseExists = await client.execute({
    sql: "SELECT id FROM monthly_expenses WHERE year=? AND month=?",
    args: [year, month],
  });
  if (expenseExists.rows.length === 0) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO monthly_expenses (year, month, water_bill, electric_bill, internet_room, internet_home, maintenance, to_father, to_mother_sibling, other_expense, other_note)
            VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0, NULL)`,
      args: [year, month],
    });
  }
}

export async function getMonthRecords(year: number, month: number): Promise<RoomRecord[]> {
  await ready();
  await ensureMonthRecords(year, month);
  const result = await client.execute({
    sql: `SELECT mr.*, r.code as room_code, r.floor as room_floor, r.is_owner as is_owner, r.active as active
          FROM monthly_records mr
          JOIN rooms r ON r.id = mr.room_id
          WHERE mr.year = ? AND mr.month = ?
          ORDER BY r.sort_order ASC`,
    args: [year, month],
  });
  return rowsToObjects<RoomRecord>(result);
}

// Like getMonthRecords, but never creates rows — used by the dashboard so that
// simply viewing/browsing a month doesn't leave behind placeholder records.
// Months nobody has opened in "จัดการข้อมูล" yet just come back empty.
export async function getMonthRecordsReadOnly(year: number, month: number): Promise<RoomRecord[]> {
  await ready();
  const result = await client.execute({
    sql: `SELECT mr.*, r.code as room_code, r.floor as room_floor, r.is_owner as is_owner, r.active as active
          FROM monthly_records mr
          JOIN rooms r ON r.id = mr.room_id
          WHERE mr.year = ? AND mr.month = ?
          ORDER BY r.sort_order ASC`,
    args: [year, month],
  });
  return rowsToObjects<RoomRecord>(result);
}

export async function updateRecord(id: number, patch: Partial<MonthlyRecord>): Promise<MonthlyRecord> {
  await ready();
  const currentResult = await client.execute({ sql: "SELECT * FROM monthly_records WHERE id = ?", args: [id] });
  if (currentResult.rows.length === 0) throw new Error("Record not found");
  const current = rowToObject<MonthlyRecord>(currentResult.rows[0], currentResult.columns);
  const next: MonthlyRecord = { ...current, ...patch, id };
  await client.execute({
    sql: `UPDATE monthly_records SET
          rent=@rent, elec_before=@elec_before, elec_after=@elec_after, elec_rate=@elec_rate,
          water_before=@water_before, water_after=@water_after, water_rate=@water_rate,
          payment_status=@payment_status, payment_date=@payment_date, note=@note
          WHERE id=@id`,
    args: {
      id: next.id,
      rent: next.rent,
      elec_before: next.elec_before,
      elec_after: next.elec_after,
      elec_rate: next.elec_rate,
      water_before: next.water_before,
      water_after: next.water_after,
      water_rate: next.water_rate,
      payment_status: next.payment_status,
      payment_date: next.payment_date,
      note: next.note,
    },
  });
  const result = await client.execute({ sql: "SELECT * FROM monthly_records WHERE id = ?", args: [id] });
  return rowToObject<MonthlyRecord>(result.rows[0], result.columns);
}

// ---------- Expenses ----------

export async function getMonthExpense(year: number, month: number): Promise<MonthlyExpense> {
  await ready();
  await ensureMonthRecords(year, month);
  const result = await client.execute({
    sql: "SELECT * FROM monthly_expenses WHERE year=? AND month=?",
    args: [year, month],
  });
  return rowToObject<MonthlyExpense>(result.rows[0], result.columns);
}

// Like getMonthExpense, but never creates a row — used by the dashboard.
export async function getMonthExpenseReadOnly(year: number, month: number): Promise<MonthlyExpense | null> {
  await ready();
  const result = await client.execute({
    sql: "SELECT * FROM monthly_expenses WHERE year=? AND month=?",
    args: [year, month],
  });
  if (result.rows.length === 0) return null;
  return rowToObject<MonthlyExpense>(result.rows[0], result.columns);
}

export async function updateExpense(id: number, patch: Partial<MonthlyExpense>): Promise<MonthlyExpense> {
  await ready();
  const currentResult = await client.execute({ sql: "SELECT * FROM monthly_expenses WHERE id = ?", args: [id] });
  if (currentResult.rows.length === 0) throw new Error("Expense not found");
  const current = rowToObject<MonthlyExpense>(currentResult.rows[0], currentResult.columns);
  const next: MonthlyExpense = { ...current, ...patch, id };
  await client.execute({
    sql: `UPDATE monthly_expenses SET
          water_bill=@water_bill, electric_bill=@electric_bill, internet_room=@internet_room,
          internet_home=@internet_home, maintenance=@maintenance, to_father=@to_father,
          to_mother_sibling=@to_mother_sibling, other_expense=@other_expense, other_note=@other_note
          WHERE id=@id`,
    args: {
      id: next.id,
      water_bill: next.water_bill,
      electric_bill: next.electric_bill,
      internet_room: next.internet_room,
      internet_home: next.internet_home,
      maintenance: next.maintenance,
      to_father: next.to_father,
      to_mother_sibling: next.to_mother_sibling,
      other_expense: next.other_expense,
      other_note: next.other_note,
    },
  });
  const result = await client.execute({ sql: "SELECT * FROM monthly_expenses WHERE id = ?", args: [id] });
  return rowToObject<MonthlyExpense>(result.rows[0], result.columns);
}

// ---------- Room details (photo + items) ----------

export async function getRoomDetails(): Promise<RoomWithItems[]> {
  await ready();
  const roomsResult = await client.execute("SELECT * FROM rooms ORDER BY sort_order ASC");
  const rooms = rowsToObjects<Room>(roomsResult);
  const itemsResult = await client.execute("SELECT * FROM room_items ORDER BY sort_order ASC, id ASC");
  const items = rowsToObjects<RoomItem>(itemsResult);

  const itemsByRoom = new Map<number, RoomItem[]>();
  for (const item of items) {
    const list = itemsByRoom.get(item.room_id) || [];
    list.push(item);
    itemsByRoom.set(item.room_id, list);
  }
  return rooms.map((r) => ({ ...r, items: itemsByRoom.get(r.id) || [] }));
}

export async function setRoomPhoto(roomId: number, photoPath: string | null): Promise<Room> {
  await ready();
  await client.execute({ sql: "UPDATE rooms SET photo_path = ? WHERE id = ?", args: [photoPath, roomId] });
  const result = await client.execute({ sql: "SELECT * FROM rooms WHERE id = ?", args: [roomId] });
  return rowToObject<Room>(result.rows[0], result.columns);
}

export async function getRoomPhotoPath(roomId: number): Promise<string | null> {
  await ready();
  const result = await client.execute({ sql: "SELECT photo_path FROM rooms WHERE id = ?", args: [roomId] });
  if (result.rows.length === 0) return null;
  return (result.rows[0].photo_path as string | null) ?? null;
}

export async function addRoomItem(
  roomId: number,
  input: { name: string; quantity?: number; note?: string | null }
): Promise<RoomItem> {
  await ready();
  const maxOrderResult = await client.execute({
    sql: "SELECT MAX(sort_order) as m FROM room_items WHERE room_id = ?",
    args: [roomId],
  });
  const maxOrder = Number(maxOrderResult.rows[0].m) || 0;
  const info = await client.execute({
    sql: "INSERT INTO room_items (room_id, name, quantity, note, sort_order) VALUES (@room_id, @name, @quantity, @note, @sort_order)",
    args: {
      room_id: roomId,
      name: input.name || "",
      quantity: input.quantity ?? 1,
      note: input.note ?? null,
      sort_order: maxOrder + 1,
    },
  });
  const result = await client.execute({
    sql: "SELECT * FROM room_items WHERE id = ?",
    args: [Number(info.lastInsertRowid)],
  });
  return rowToObject<RoomItem>(result.rows[0], result.columns);
}

export async function updateRoomItem(id: number, patch: Partial<RoomItem>): Promise<RoomItem> {
  await ready();
  const currentResult = await client.execute({ sql: "SELECT * FROM room_items WHERE id = ?", args: [id] });
  if (currentResult.rows.length === 0) throw new Error("Room item not found");
  const current = rowToObject<RoomItem>(currentResult.rows[0], currentResult.columns);
  const next: RoomItem = { ...current, ...patch, id };
  await client.execute({
    sql: "UPDATE room_items SET name=@name, quantity=@quantity, note=@note, sort_order=@sort_order WHERE id=@id",
    args: { id: next.id, name: next.name, quantity: next.quantity, note: next.note, sort_order: next.sort_order },
  });
  const result = await client.execute({ sql: "SELECT * FROM room_items WHERE id = ?", args: [id] });
  return rowToObject<RoomItem>(result.rows[0], result.columns);
}

export async function deleteRoomItem(id: number): Promise<void> {
  await ready();
  await client.execute({ sql: "DELETE FROM room_items WHERE id = ?", args: [id] });
}

export type { PaymentStatus };
