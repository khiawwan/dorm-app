import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import type { MonthlyExpense, MonthlyRecord, PaymentStatus, Room, RoomItem, RoomRecord, RoomWithItems } from "./types";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "dorm.db");
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(path.dirname(DB_PATH), "uploads");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __dormDb: DatabaseSync | undefined;
}

// node:sqlite returns rows as null-prototype objects, which Next.js refuses to
// pass across the Server -> Client Component boundary. Strip them to plain objects.
function toPlain<T>(row: T): T {
  return row == null ? row : ({ ...(row as object) } as T);
}
function toPlainList<T>(rows: T[]): T[] {
  return rows.map(toPlain);
}

function runInTransaction(db: DatabaseSync, fn: () => void) {
  db.exec("BEGIN");
  try {
    fn();
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function init(db: DatabaseSync) {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      floor TEXT NOT NULL,
      is_owner INTEGER NOT NULL DEFAULT 0,
      default_rent INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      photo_path TEXT
    );

    CREATE TABLE IF NOT EXISTS room_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS monthly_records (
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
    );

    CREATE TABLE IF NOT EXISTS monthly_expenses (
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
    );
  `);

  const roomColumns = db.prepare("PRAGMA table_info(rooms)").all() as unknown as { name: string }[];
  if (!roomColumns.some((c) => c.name === "photo_path")) {
    db.exec("ALTER TABLE rooms ADD COLUMN photo_path TEXT");
  }

  const count = db.prepare("SELECT COUNT(*) as c FROM rooms").get() as { c: number };
  if (count.c === 0) {
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
    const insert = db.prepare(
      `INSERT INTO rooms (code, floor, is_owner, default_rent, sort_order, active) VALUES (?, ?, ?, ?, ?, 1)`
    );
    runInTransaction(db, () => {
      for (const [code, floor, isOwner, rent, order] of seed) {
        insert.run(code, floor, isOwner, rent, order);
      }
    });
  }
}

export function getDb(): DatabaseSync {
  if (!global.__dormDb) {
    const db = new DatabaseSync(DB_PATH);
    init(db);
    global.__dormDb = db;
  }
  return global.__dormDb;
}

// ---------- Rooms ----------

export function listRooms(includeInactive = true): Room[] {
  const db = getDb();
  const sql = includeInactive
    ? "SELECT * FROM rooms ORDER BY sort_order ASC"
    : "SELECT * FROM rooms WHERE active = 1 ORDER BY sort_order ASC";
  return toPlainList(db.prepare(sql).all() as unknown as Room[]);
}

export function createRoom(input: Partial<Room>): Room {
  const db = getDb();
  const maxOrder = (db.prepare("SELECT MAX(sort_order) as m FROM rooms").get() as { m: number | null }).m || 0;
  const info = db
    .prepare(
      `INSERT INTO rooms (code, floor, is_owner, default_rent, sort_order, active)
       VALUES (@code, @floor, @is_owner, @default_rent, @sort_order, @active)`
    )
    .run({
      code: input.code || `ROOM${maxOrder + 1}`,
      floor: input.floor || "F",
      is_owner: input.is_owner ? 1 : 0,
      default_rent: input.default_rent ?? 0,
      sort_order: input.sort_order ?? maxOrder + 1,
      active: input.active ?? 1,
    });
  return toPlain(db.prepare("SELECT * FROM rooms WHERE id = ?").get(info.lastInsertRowid) as unknown as Room);
}

export function updateRoom(id: number, patch: Partial<Room>): Room {
  const db = getDb();
  const current = db.prepare("SELECT * FROM rooms WHERE id = ?").get(id) as unknown as Room | undefined;
  if (!current) throw new Error("Room not found");
  const next: Room = { ...current, ...patch, id };
  db.prepare(
    `UPDATE rooms SET code=@code, floor=@floor, is_owner=@is_owner, default_rent=@default_rent,
       sort_order=@sort_order, active=@active WHERE id=@id`
  ).run({
    id: next.id,
    code: next.code,
    floor: next.floor,
    is_owner: next.is_owner,
    default_rent: next.default_rent,
    sort_order: next.sort_order,
    active: next.active,
  });
  return toPlain(db.prepare("SELECT * FROM rooms WHERE id = ?").get(id) as unknown as Room);
}

export function deleteRoom(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM rooms WHERE id = ?").run(id);
}

// ---------- Monthly records ----------

function findPrevReadings(db: DatabaseSync, roomId: number, year: number, month: number) {
  let py = year;
  let pm = month - 1;
  if (pm < 1) {
    pm = 12;
    py = year - 1;
  }
  const prev = db
    .prepare("SELECT elec_after, water_after FROM monthly_records WHERE room_id=? AND year=? AND month=?")
    .get(roomId, py, pm) as unknown as { elec_after: number; water_after: number } | undefined;
  return prev || { elec_after: 0, water_after: 0 };
}

export function ensureMonthRecords(year: number, month: number): void {
  const db = getDb();
  const rooms = db.prepare("SELECT * FROM rooms WHERE active = 1 ORDER BY sort_order ASC").all() as unknown as Room[];
  const existing = db
    .prepare("SELECT room_id FROM monthly_records WHERE year=? AND month=?")
    .all(year, month) as unknown as { room_id: number }[];
  const existingIds = new Set(existing.map((e) => e.room_id));
  const insert = db.prepare(
    `INSERT INTO monthly_records
      (room_id, year, month, rent, elec_before, elec_after, elec_rate, water_before, water_after, water_rate, payment_status, payment_date, note)
     VALUES
      (@room_id, @year, @month, @rent, @elec_before, @elec_after, @elec_rate, @water_before, @water_after, @water_rate, @payment_status, NULL, NULL)`
  );
  runInTransaction(db, () => {
    for (const room of rooms) {
      if (existingIds.has(room.id)) continue;
      const prev = findPrevReadings(db, room.id, year, month);
      insert.run({
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
      });
    }
  });

  const expenseExists = db.prepare("SELECT id FROM monthly_expenses WHERE year=? AND month=?").get(year, month);
  if (!expenseExists) {
    db.prepare(
      `INSERT INTO monthly_expenses (year, month, water_bill, electric_bill, internet_room, internet_home, maintenance, to_father, to_mother_sibling, other_expense, other_note)
       VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0, NULL)`
    ).run(year, month);
  }
}

export function getMonthRecords(year: number, month: number): RoomRecord[] {
  ensureMonthRecords(year, month);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT mr.*, r.code as room_code, r.floor as room_floor, r.is_owner as is_owner, r.active as active
       FROM monthly_records mr
       JOIN rooms r ON r.id = mr.room_id
       WHERE mr.year = ? AND mr.month = ?
       ORDER BY r.sort_order ASC`
    )
    .all(year, month) as unknown as RoomRecord[];
  return toPlainList(rows);
}

export function updateRecord(id: number, patch: Partial<MonthlyRecord>): MonthlyRecord {
  const db = getDb();
  const current = db.prepare("SELECT * FROM monthly_records WHERE id = ?").get(id) as unknown as
    | MonthlyRecord
    | undefined;
  if (!current) throw new Error("Record not found");
  const next: MonthlyRecord = { ...current, ...patch, id };
  db.prepare(
    `UPDATE monthly_records SET
      rent=@rent, elec_before=@elec_before, elec_after=@elec_after, elec_rate=@elec_rate,
      water_before=@water_before, water_after=@water_after, water_rate=@water_rate,
      payment_status=@payment_status, payment_date=@payment_date, note=@note
     WHERE id=@id`
  ).run({
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
  });
  return toPlain(db.prepare("SELECT * FROM monthly_records WHERE id = ?").get(id) as unknown as MonthlyRecord);
}

// ---------- Expenses ----------

export function getMonthExpense(year: number, month: number): MonthlyExpense {
  ensureMonthRecords(year, month);
  const db = getDb();
  return toPlain(
    db.prepare("SELECT * FROM monthly_expenses WHERE year=? AND month=?").get(year, month) as unknown as MonthlyExpense
  );
}

export function updateExpense(id: number, patch: Partial<MonthlyExpense>): MonthlyExpense {
  const db = getDb();
  const current = db.prepare("SELECT * FROM monthly_expenses WHERE id = ?").get(id) as unknown as
    | MonthlyExpense
    | undefined;
  if (!current) throw new Error("Expense not found");
  const next: MonthlyExpense = { ...current, ...patch, id };
  db.prepare(
    `UPDATE monthly_expenses SET
      water_bill=@water_bill, electric_bill=@electric_bill, internet_room=@internet_room,
      internet_home=@internet_home, maintenance=@maintenance, to_father=@to_father,
      to_mother_sibling=@to_mother_sibling, other_expense=@other_expense, other_note=@other_note
     WHERE id=@id`
  ).run({
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
  });
  return toPlain(db.prepare("SELECT * FROM monthly_expenses WHERE id = ?").get(id) as unknown as MonthlyExpense);
}

// ---------- Room details (photo + items) ----------

export function getRoomDetails(): RoomWithItems[] {
  const db = getDb();
  const rooms = db.prepare("SELECT * FROM rooms ORDER BY sort_order ASC").all() as unknown as Room[];
  const items = toPlainList(
    db.prepare("SELECT * FROM room_items ORDER BY sort_order ASC, id ASC").all() as unknown as RoomItem[]
  );
  const itemsByRoom = new Map<number, RoomItem[]>();
  for (const item of items) {
    const list = itemsByRoom.get(item.room_id) || [];
    list.push(item);
    itemsByRoom.set(item.room_id, list);
  }
  return toPlainList(rooms.map((r) => ({ ...r, items: itemsByRoom.get(r.id) || [] })));
}

export function setRoomPhoto(roomId: number, photoPath: string | null): Room {
  const db = getDb();
  db.prepare("UPDATE rooms SET photo_path = ? WHERE id = ?").run(photoPath, roomId);
  return toPlain(db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as unknown as Room);
}

export function getRoomPhotoPath(roomId: number): string | null {
  const db = getDb();
  const row = db.prepare("SELECT photo_path FROM rooms WHERE id = ?").get(roomId) as unknown as
    | { photo_path: string | null }
    | undefined;
  return row?.photo_path ?? null;
}

export function addRoomItem(roomId: number, input: { name: string; quantity?: number; note?: string | null }): RoomItem {
  const db = getDb();
  const maxOrder =
    (db.prepare("SELECT MAX(sort_order) as m FROM room_items WHERE room_id = ?").get(roomId) as { m: number | null })
      .m || 0;
  const info = db
    .prepare("INSERT INTO room_items (room_id, name, quantity, note, sort_order) VALUES (@room_id, @name, @quantity, @note, @sort_order)")
    .run({
      room_id: roomId,
      name: input.name || "",
      quantity: input.quantity ?? 1,
      note: input.note ?? null,
      sort_order: maxOrder + 1,
    });
  return toPlain(db.prepare("SELECT * FROM room_items WHERE id = ?").get(info.lastInsertRowid) as unknown as RoomItem);
}

export function updateRoomItem(id: number, patch: Partial<RoomItem>): RoomItem {
  const db = getDb();
  const current = db.prepare("SELECT * FROM room_items WHERE id = ?").get(id) as unknown as RoomItem | undefined;
  if (!current) throw new Error("Room item not found");
  const next: RoomItem = { ...current, ...patch, id };
  db.prepare("UPDATE room_items SET name=@name, quantity=@quantity, note=@note, sort_order=@sort_order WHERE id=@id").run({
    id: next.id,
    name: next.name,
    quantity: next.quantity,
    note: next.note,
    sort_order: next.sort_order,
  });
  return toPlain(db.prepare("SELECT * FROM room_items WHERE id = ?").get(id) as unknown as RoomItem);
}

export function deleteRoomItem(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM room_items WHERE id = ?").run(id);
}

export type { PaymentStatus };
