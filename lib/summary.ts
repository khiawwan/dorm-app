import { getMonthExpense, getMonthRecords } from "./db";
import { elecCost, expenseTotal, MonthSummary, recordTotal, waterCost } from "./types";

export async function getMonthSummary(year: number, month: number): Promise<MonthSummary> {
  const [records, expense] = await Promise.all([getMonthRecords(year, month), getMonthExpense(year, month)]);

  let total_rent = 0;
  let total_elec = 0;
  let total_water = 0;
  let total_income = 0;
  let occupied_rooms = 0;
  let paid_rooms = 0;
  let unpaid_rooms = 0;

  for (const r of records) {
    total_rent += r.rent;
    total_elec += elecCost(r);
    total_water += waterCost(r);
    total_income += recordTotal(r);
    if (r.payment_status !== "ไม่มีผู้เช่า") {
      occupied_rooms += 1;
      if (r.payment_status === "โอน" || r.payment_status === "เงินสด") paid_rooms += 1;
      if (r.payment_status === "ยังไม่จ่าย") unpaid_rooms += 1;
    }
  }

  const total_expense = expenseTotal(expense);

  return {
    year,
    month,
    total_rent,
    total_elec,
    total_water,
    total_income,
    total_expense,
    remaining: total_income - total_expense,
    occupied_rooms,
    paid_rooms,
    unpaid_rooms,
  };
}

export async function getYearSummary(year: number): Promise<MonthSummary[]> {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return Promise.all(months.map((m) => getMonthSummary(year, m)));
}
