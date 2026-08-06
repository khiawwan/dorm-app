// One-off / re-runnable importer: reads the dorm's monthly spreadsheet export (CSV)
// and upserts monthly_records + monthly_expenses for every month block found.
//
// Usage:
//   node scripts/import-csv.mjs "C:\path\to\หอพักเขียวหวาน - ปี2569.csv"

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, "data", "dorm.db");

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/import-csv.mjs <path-to-csv>");
  process.exit(1);
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const MONTH_INDEX = Object.fromEntries(THAI_MONTHS.map((name, i) => [name, i + 1]));

const THAI_ABBR_MONTHS = {
  "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6,
  "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
};

const VALID_STATUSES = new Set(["โอน", "เงินสด", "ยังไม่จ่าย", "ไม่มีผู้เช่า"]);

// ---------- CSV parsing (handles quoted fields with embedded commas/newlines) ----------

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function cell(row, i) {
  return (row?.[i] ?? "").trim();
}

function parseNum(raw) {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/,/g, "").trim();
  if (cleaned === "") return 0;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function buildNote(...parts) {
  const joined = parts.map((p) => (p || "").trim()).filter(Boolean).join("; ");
  return joined || null;
}

// D/M/YY (พ.ศ. 2 หลัก) เช่น 4/2/69 หรือ D เดือนย่อ. YY เช่น "4 เม.ย. 69"
function parseThaiDate(raw) {
  const s = (raw || "").trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) {
    const [, d, mo, yy] = m;
    const beYear = 2500 + parseInt(yy, 10);
    const gregorianYear = beYear - 543;
    return `${gregorianYear}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  m = s.match(/^(\d{1,2})\s+([ก-๙.]+)\s+(\d{2})$/);
  if (m) {
    const [, d, abbr, yy] = m;
    const mo = THAI_ABBR_MONTHS[abbr];
    if (mo) {
      const beYear = 2500 + parseInt(yy, 10);
      const gregorianYear = beYear - 543;
      return `${gregorianYear}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  return null;
}

function parseRoomRow(row, code) {
  const rent = parseNum(cell(row, 1));
  const elecBefore = parseNum(cell(row, 2));
  const elecAfter = parseNum(cell(row, 3));
  const waterBefore = parseNum(cell(row, 6));
  const waterAfter = parseNum(cell(row, 7));
  const statusRaw = cell(row, 11);
  const dateRaw = cell(row, 12);
  let note = cell(row, 13);

  let status;
  if (code === "F1") {
    status = "ไม่มีผู้เช่า";
  } else if (statusRaw === "ยังไม่ชำระ") {
    status = "ยังไม่จ่าย";
  } else if (VALID_STATUSES.has(statusRaw)) {
    status = statusRaw;
  } else if (statusRaw === "") {
    status = "ยังไม่จ่าย";
  } else {
    status = "ยังไม่จ่าย";
    note = buildNote(note, `[เดิม: ${statusRaw}]`);
  }

  const paymentDate = parseThaiDate(dateRaw);
  if (dateRaw && !paymentDate) {
    note = buildNote(note, dateRaw);
  }

  return {
    rent,
    elec_before: elecBefore,
    elec_after: elecAfter,
    elec_rate: 7,
    water_before: waterBefore,
    water_after: waterAfter,
    water_rate: 22,
    payment_status: status,
    payment_date: paymentDate,
    note,
  };
}

function parseExpenseBlock(headerRow, valueRow, extraNoteRow) {
  const trailing = buildNote(cell(headerRow, 14), cell(valueRow, 14));
  const noteRowText = extraNoteRow
    ? extraNoteRow.slice(1).map((s) => (s || "").trim()).filter(Boolean).join(" ")
    : "";
  const other_note = buildNote(trailing, noteRowText);

  return {
    water_bill: parseNum(cell(valueRow, 1)),
    electric_bill: parseNum(cell(valueRow, 2)),
    internet_room: parseNum(cell(valueRow, 3)),
    internet_home: parseNum(cell(valueRow, 4)),
    maintenance: parseNum(cell(valueRow, 5)),
    to_father: parseNum(cell(valueRow, 7)),
    to_mother_sibling: parseNum(cell(valueRow, 8)),
    other_expense: parseNum(cell(valueRow, 9)),
    other_note,
  };
}

const ROOM_ORDER = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "L1", "L2", "L3", "L4", "L5", "L6", "L7"];

function extractMonthBlocks(rows) {
  const blocks = [];
  let i = 0;
  while (i < rows.length) {
    const title = cell(rows[i], 0);
    const m = title.match(/ประจำเดือน([ก-๙]+)\s+(\d+)/);
    if (m) {
      const monthName = m[1];
      const year = parseInt(m[2], 10);
      const month = MONTH_INDEX[monthName];
      if (!month) {
        console.warn(`ไม่รู้จักชื่อเดือน "${monthName}" ข้ามบล็อกนี้`);
        i++;
        continue;
      }
      i += 1; // title row
      i += 2; // header row + ก่อน/หลัง subheader row

      const roomRows = [];
      for (let k = 0; k < ROOM_ORDER.length; k++) {
        roomRows.push(rows[i]);
        i++;
      }
      i += 1; // "รวมค่าห้อง..." totals row

      while (i < rows.length && !cell(rows[i], 0).startsWith("ค่าใช้จ่าย")) {
        i++;
      }
      const expenseHeader = rows[i];
      i++;
      const expenseValues = rows[i];
      i++;

      let extraNoteRow = null;
      if (rows[i] && cell(rows[i], 0).startsWith("*หมายเหตุ")) {
        extraNoteRow = rows[i];
        i++;
      }

      blocks.push({ year, month, monthName, roomRows, expenseHeader, expenseValues, extraNoteRow });
      continue;
    }
    i++;
  }
  return blocks;
}

// ---------- DB ----------

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
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
    active INTEGER NOT NULL DEFAULT 1
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

const roomSeed = [
  ["F1", "F", 1, 0, 1], ["F2", "F", 0, 1700, 2], ["F3", "F", 0, 1500, 3], ["F4", "F", 0, 1500, 4],
  ["F5", "F", 0, 0, 5], ["F6", "F", 0, 1700, 6], ["F7", "F", 0, 1600, 7], ["L1", "L", 0, 1800, 8],
  ["L2", "L", 0, 0, 9], ["L3", "L", 0, 1600, 10], ["L4", "L", 0, 1700, 11], ["L5", "L", 0, 1600, 12],
  ["L6", "L", 0, 2100, 13], ["L7", "L", 0, 0, 14],
];
if ((db.prepare("SELECT COUNT(*) as c FROM rooms").get()).c === 0) {
  const insert = db.prepare(
    "INSERT INTO rooms (code, floor, is_owner, default_rent, sort_order, active) VALUES (?, ?, ?, ?, ?, 1)"
  );
  for (const [code, floor, isOwner, rent, order] of roomSeed) insert.run(code, floor, isOwner, rent, order);
}

const roomIdByCode = {};
for (const r of db.prepare("SELECT id, code FROM rooms").all()) roomIdByCode[r.code] = r.id;

const upsertRecord = db.prepare(`
  INSERT INTO monthly_records
    (room_id, year, month, rent, elec_before, elec_after, elec_rate, water_before, water_after, water_rate, payment_status, payment_date, note)
  VALUES
    (@room_id, @year, @month, @rent, @elec_before, @elec_after, @elec_rate, @water_before, @water_after, @water_rate, @payment_status, @payment_date, @note)
  ON CONFLICT(room_id, year, month) DO UPDATE SET
    rent=excluded.rent, elec_before=excluded.elec_before, elec_after=excluded.elec_after, elec_rate=excluded.elec_rate,
    water_before=excluded.water_before, water_after=excluded.water_after, water_rate=excluded.water_rate,
    payment_status=excluded.payment_status, payment_date=excluded.payment_date, note=excluded.note
`);

const upsertExpense = db.prepare(`
  INSERT INTO monthly_expenses
    (year, month, water_bill, electric_bill, internet_room, internet_home, maintenance, to_father, to_mother_sibling, other_expense, other_note)
  VALUES
    (@year, @month, @water_bill, @electric_bill, @internet_room, @internet_home, @maintenance, @to_father, @to_mother_sibling, @other_expense, @other_note)
  ON CONFLICT(year, month) DO UPDATE SET
    water_bill=excluded.water_bill, electric_bill=excluded.electric_bill, internet_room=excluded.internet_room,
    internet_home=excluded.internet_home, maintenance=excluded.maintenance, to_father=excluded.to_father,
    to_mother_sibling=excluded.to_mother_sibling, other_expense=excluded.other_expense, other_note=excluded.other_note
`);

// ---------- Run ----------

let raw = fs.readFileSync(csvPath, "utf8");
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // strip BOM

const rows = parseCSV(raw);
const blocks = extractMonthBlocks(rows);

if (blocks.length === 0) {
  console.error("ไม่พบข้อมูลรายเดือนในไฟล์นี้ ตรวจสอบรูปแบบไฟล์อีกครั้ง");
  process.exit(1);
}

console.log(`พบข้อมูล ${blocks.length} เดือน: ${blocks.map((b) => `${b.monthName} ${b.year}`).join(", ")}`);

db.exec("BEGIN");
try {
  for (const block of blocks) {
    for (let k = 0; k < ROOM_ORDER.length; k++) {
      const code = ROOM_ORDER[k];
      const roomId = roomIdByCode[code];
      if (!roomId) {
        console.warn(`ไม่พบห้อง ${code} ในฐานข้อมูล ข้าม`);
        continue;
      }
      const rowCode = cell(block.roomRows[k], 0);
      if (rowCode !== code) {
        console.warn(
          `เดือน ${block.monthName}: แถวที่ ${k} คาดว่าเป็นห้อง ${code} แต่พบ "${rowCode}" — ข้ามแถวนี้`
        );
        continue;
      }
      const parsed = parseRoomRow(block.roomRows[k], code);
      upsertRecord.run({ room_id: roomId, year: block.year, month: block.month, ...parsed });
    }

    const expense = parseExpenseBlock(block.expenseHeader, block.expenseValues, block.extraNoteRow);
    upsertExpense.run({ year: block.year, month: block.month, ...expense });

    console.log(`บันทึกเดือน ${block.monthName} ${block.year} แล้ว`);
  }
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  throw err;
}

console.log("นำเข้าข้อมูลเสร็จสิ้น");
