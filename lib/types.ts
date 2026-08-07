export type PaymentStatus = "โอน" | "เงินสด" | "ยังไม่จ่าย" | "ไม่มีผู้เช่า";

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  "โอน",
  "เงินสด",
  "ยังไม่จ่าย",
  "ไม่มีผู้เช่า",
];

export interface Room {
  id: number;
  code: string;
  floor: string;
  is_owner: number;
  default_rent: number;
  sort_order: number;
  active: number;
  photo_path: string | null;
}

export interface RoomItem {
  id: number;
  room_id: number;
  name: string;
  quantity: number;
  note: string | null;
  sort_order: number;
}

export interface RoomWithItems extends Room {
  items: RoomItem[];
}

export interface Tenant {
  id: number;
  room_id: number;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  phone: string | null;
  address: string | null;
}

export interface RoomWithTenant extends Room {
  tenant: Tenant;
}

export interface MonthlyRecord {
  id: number;
  room_id: number;
  year: number;
  month: number;
  rent: number;
  elec_before: number;
  elec_after: number;
  elec_rate: number;
  water_before: number;
  water_after: number;
  water_rate: number;
  payment_status: PaymentStatus;
  payment_date: string | null;
  note: string | null;
}

export interface RoomRecord extends MonthlyRecord {
  room_code: string;
  room_floor: string;
  is_owner: number;
  active: number;
}

export interface MonthlyExpense {
  id: number;
  year: number;
  month: number;
  water_bill: number;
  electric_bill: number;
  internet_room: number;
  internet_home: number;
  maintenance: number;
  to_father: number;
  to_mother_sibling: number;
  other_expense: number;
  other_note: string | null;
}

export interface MonthSummary {
  year: number;
  month: number;
  total_rent: number;
  total_elec: number;
  total_water: number;
  total_income: number;
  total_expense: number;
  remaining: number;
  occupied_rooms: number;
  paid_rooms: number;
  unpaid_rooms: number;
}

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function elecUnits(r: Pick<MonthlyRecord, "elec_before" | "elec_after">) {
  return Math.max(0, r.elec_after - r.elec_before);
}
export function waterUnits(r: Pick<MonthlyRecord, "water_before" | "water_after">) {
  return Math.max(0, r.water_after - r.water_before);
}
export function elecCost(r: Pick<MonthlyRecord, "elec_before" | "elec_after" | "elec_rate">) {
  return elecUnits(r) * r.elec_rate;
}
export function waterCost(r: Pick<MonthlyRecord, "water_before" | "water_after" | "water_rate">) {
  return waterUnits(r) * r.water_rate;
}
export function recordTotal(
  r: Pick<
    MonthlyRecord,
    "rent" | "elec_before" | "elec_after" | "elec_rate" | "water_before" | "water_after" | "water_rate"
  >
) {
  return r.rent + elecCost(r) + waterCost(r);
}
export function expenseTotal(e: MonthlyExpense) {
  return (
    e.water_bill +
    e.electric_bill +
    e.internet_room +
    e.internet_home +
    e.maintenance +
    e.to_father +
    e.to_mother_sibling +
    e.other_expense
  );
}
