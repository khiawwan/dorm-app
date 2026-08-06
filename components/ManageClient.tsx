"use client";

import { useMemo, useRef, useState } from "react";
import { Zap, Droplets, Receipt, Wallet, PiggyBank, TableProperties } from "lucide-react";
import { baht } from "@/lib/format";
import {
  elecCost,
  elecUnits,
  expenseTotal,
  MonthlyExpense,
  PAYMENT_STATUS_OPTIONS,
  recordTotal,
  RoomRecord,
  waterCost,
  waterUnits,
} from "@/lib/types";

type SaveState = "idle" | "saving" | "saved";

function useDebouncedSave() {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  return function debounced(key: string, fn: () => void, delay = 600) {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, delay);
  };
}

export default function ManageClient({
  year,
  month,
  monthLabel,
  initialRecords,
  initialExpense,
}: {
  year: number;
  month: number;
  monthLabel: string;
  initialRecords: RoomRecord[];
  initialExpense: MonthlyExpense;
}) {
  const [records, setRecords] = useState<RoomRecord[]>(initialRecords);
  const [expense, setExpense] = useState<MonthlyExpense>(initialExpense);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [bulkRate, setBulkRate] = useState({ elec: 7, water: 22 });
  const debounced = useDebouncedSave();

  const totals = useMemo(() => {
    let rent = 0,
      elec = 0,
      water = 0,
      total = 0;
    for (const r of records) {
      rent += r.rent;
      elec += elecCost(r);
      water += waterCost(r);
      total += recordTotal(r);
    }
    return { rent, elec, water, total };
  }, [records]);

  const totalExpense = expenseTotal(expense);
  const remaining = totals.total - totalExpense;

  function markSaving(key: string) {
    setSaveState((s) => ({ ...s, [key]: "saving" }));
  }
  function markSaved(key: string) {
    setSaveState((s) => ({ ...s, [key]: "saved" }));
    setTimeout(() => setSaveState((s) => ({ ...s, [key]: "idle" })), 1500);
  }

  function saveRecord(record: RoomRecord) {
    const key = `record-${record.id}`;
    markSaving(key);
    fetch(`/api/records/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rent: record.rent,
        elec_before: record.elec_before,
        elec_after: record.elec_after,
        elec_rate: record.elec_rate,
        water_before: record.water_before,
        water_after: record.water_after,
        water_rate: record.water_rate,
        payment_status: record.payment_status,
        payment_date: record.payment_date,
        note: record.note,
      }),
    })
      .then(() => markSaved(key))
      .catch(() => setSaveState((s) => ({ ...s, [key]: "idle" })));
  }

  function updateRecordField<K extends keyof RoomRecord>(id: number, field: K, value: RoomRecord[K]) {
    setRecords((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      const updated = next.find((r) => r.id === id);
      if (updated) debounced(`record-${id}`, () => saveRecord(updated));
      return next;
    });
  }

  function applyRatesToAll() {
    setRecords((prev) => {
      const next = prev.map((r) => ({ ...r, elec_rate: bulkRate.elec, water_rate: bulkRate.water }));
      next.forEach((r) => debounced(`record-${r.id}`, () => saveRecord(r), 100));
      return next;
    });
  }

  function saveExpense(next: MonthlyExpense) {
    const key = "expense";
    markSaving(key);
    fetch(`/api/expenses/${next.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        water_bill: next.water_bill,
        electric_bill: next.electric_bill,
        internet_room: next.internet_room,
        internet_home: next.internet_home,
        maintenance: next.maintenance,
        to_father: next.to_father,
        to_mother_sibling: next.to_mother_sibling,
        other_expense: next.other_expense,
        other_note: next.other_note,
      }),
    })
      .then(() => markSaved(key))
      .catch(() => setSaveState((s) => ({ ...s, [key]: "idle" })));
  }

  function updateExpenseField<K extends keyof MonthlyExpense>(field: K, value: MonthlyExpense[K]) {
    setExpense((prev) => {
      const next = { ...prev, [field]: value };
      debounced("expense", () => saveExpense(next));
      return next;
    });
  }

  const inputCls =
    "w-full min-w-[70px] rounded-lg border border-brand-100 bg-white px-2 py-1 text-right text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <TableProperties className="h-5 w-5 text-brand-600" strokeWidth={2.25} />
            ตารางบันทึกค่าเช่า เดือน{monthLabel}
          </h2>
          <p className="text-xs text-gray-500">แก้ไขค่าในตารางแล้วระบบจะบันทึกให้อัตโนมัติ</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> ค่าไฟ/หน่วย
            </span>
            <input
              type="number"
              value={bulkRate.elec}
              onChange={(e) => setBulkRate((s) => ({ ...s, elec: Number(e.target.value) }))}
              className="mt-1 block w-20 rounded-lg border border-brand-100 px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
            />
          </label>
          <label className="text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-sky-500" /> ค่าน้ำ/หน่วย
            </span>
            <input
              type="number"
              value={bulkRate.water}
              onChange={(e) => setBulkRate((s) => ({ ...s, water: Number(e.target.value) }))}
              className="mt-1 block w-20 rounded-lg border border-brand-100 px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
            />
          </label>
          <button
            onClick={applyRatesToAll}
            className="rounded-xl2 bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            ใช้ราคานี้กับทุกห้อง
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-brand-100 bg-white shadow-soft">
        <table className="w-full min-w-[1400px] text-sm">
          <thead className="bg-brand-50 text-xs text-brand-800">
            <tr>
              <th className="px-2 py-2.5">ห้อง</th>
              <th className="px-2 py-2.5">ค่าเช่า</th>
              <th className="px-2 py-2.5" colSpan={2}>มิเตอร์ไฟ (ก่อน/หลัง)</th>
              <th className="px-2 py-2.5">หน่วยไฟ</th>
              <th className="px-2 py-2.5">฿/หน่วย</th>
              <th className="px-2 py-2.5">ค่าไฟ</th>
              <th className="px-2 py-2.5" colSpan={2}>มิเตอร์น้ำ (ก่อน/หลัง)</th>
              <th className="px-2 py-2.5">หน่วยน้ำ</th>
              <th className="px-2 py-2.5">฿/หน่วย</th>
              <th className="px-2 py-2.5">ค่าน้ำ</th>
              <th className="px-2 py-2.5">รวมทั้งหมด</th>
              <th className="px-2 py-2.5">สถานะจ่าย</th>
              <th className="px-2 py-2.5">วันที่ชำระ</th>
              <th className="px-2 py-2.5">หมายเหตุ</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const key = `record-${r.id}`;
              const state = saveState[key] || "idle";
              return (
                <tr
                  key={r.id}
                  className={`border-t border-brand-50 ${r.is_owner ? "bg-violet-50" : "hover:bg-brand-50/50"}`}
                >
                  <td className="px-2 py-1 text-center font-bold text-gray-700">{r.room_code}</td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className={inputCls}
                      value={r.rent}
                      onChange={(e) => updateRecordField(r.id, "rent", Number(e.target.value))}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      className={inputCls}
                      value={r.elec_before}
                      onChange={(e) => updateRecordField(r.id, "elec_before", Number(e.target.value))}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      className={inputCls}
                      value={r.elec_after}
                      onChange={(e) => updateRecordField(r.id, "elec_after", Number(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-1 text-right text-gray-500">{elecUnits(r)}</td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      className={inputCls}
                      value={r.elec_rate}
                      onChange={(e) => updateRecordField(r.id, "elec_rate", Number(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-medium text-amber-600">{baht(elecCost(r))}</td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      className={inputCls}
                      value={r.water_before}
                      onChange={(e) => updateRecordField(r.id, "water_before", Number(e.target.value))}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      className={inputCls}
                      value={r.water_after}
                      onChange={(e) => updateRecordField(r.id, "water_after", Number(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-1 text-right text-gray-500">{waterUnits(r)}</td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      className={inputCls}
                      value={r.water_rate}
                      onChange={(e) => updateRecordField(r.id, "water_rate", Number(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-medium text-sky-600">{baht(waterCost(r))}</td>
                  <td className="px-2 py-1 text-right text-base font-bold text-brand-700">
                    {baht(recordTotal(r))}
                  </td>
                  <td className="px-1 py-1">
                    <select
                      className="w-full rounded-lg border border-brand-100 bg-white px-1 py-1 text-xs focus:border-brand-400 focus:outline-none"
                      value={r.payment_status}
                      onChange={(e) =>
                        updateRecordField(r.id, "payment_status", e.target.value as RoomRecord["payment_status"])
                      }
                    >
                      {PAYMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="date"
                      className="w-full rounded-lg border border-brand-100 bg-white px-1 py-1 text-xs focus:border-brand-400 focus:outline-none"
                      value={r.payment_date || ""}
                      onChange={(e) => updateRecordField(r.id, "payment_date", e.target.value || null)}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      className="w-full min-w-[100px] rounded-lg border border-brand-100 bg-white px-2 py-1 text-xs focus:border-brand-400 focus:outline-none"
                      value={r.note || ""}
                      onChange={(e) => updateRecordField(r.id, "note", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1 text-center text-xs">
                    {state === "saving" && <span className="text-amber-500">กำลังบันทึก…</span>}
                    {state === "saved" && <span className="text-brand-600">✓ บันทึกแล้ว</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-brand-50/70 text-sm font-bold">
            <tr className="border-t border-brand-100">
              <td className="px-2 py-2">รวม</td>
              <td className="px-2 py-2 text-right">{baht(totals.rent)}</td>
              <td colSpan={3}></td>
              <td className="px-2 py-2 text-right text-amber-600">{baht(totals.elec)}</td>
              <td colSpan={3}></td>
              <td className="px-2 py-2 text-right text-sky-600">{baht(totals.water)}</td>
              <td className="px-2 py-2 text-right text-brand-700">{baht(totals.total)}</td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Receipt className="h-5 w-5 text-accent-500" strokeWidth={2.25} />
            ค่าใช้จ่ายประจำเดือน{monthLabel}
          </h2>
          {saveState["expense"] === "saving" && <span className="text-xs text-amber-500">กำลังบันทึก…</span>}
          {saveState["expense"] === "saved" && <span className="text-xs text-brand-600">✓ บันทึกแล้ว</span>}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ExpenseField label="ค่าน้ำ" value={expense.water_bill} onChange={(v) => updateExpenseField("water_bill", v)} />
          <ExpenseField
            label="ค่าไฟฟ้า"
            value={expense.electric_bill}
            onChange={(v) => updateExpenseField("electric_bill", v)}
          />
          <ExpenseField
            label="ค่าเน็ตหอ"
            value={expense.internet_room}
            onChange={(v) => updateExpenseField("internet_room", v)}
          />
          <ExpenseField
            label="ค่าเน็ตบ้าน"
            value={expense.internet_home}
            onChange={(v) => updateExpenseField("internet_home", v)}
          />
          <ExpenseField
            label="ค่าซ่อมแซมบำรุงหอพัก"
            value={expense.maintenance}
            onChange={(v) => updateExpenseField("maintenance", v)}
          />
          <ExpenseField label="ให้พ่อ" value={expense.to_father} onChange={(v) => updateExpenseField("to_father", v)} />
          <ExpenseField
            label="ให้แม่+พี่"
            value={expense.to_mother_sibling}
            onChange={(v) => updateExpenseField("to_mother_sibling", v)}
          />
          <ExpenseField
            label="ค่าใช้จ่ายอื่นๆ"
            value={expense.other_expense}
            onChange={(v) => updateExpenseField("other_expense", v)}
          />
        </div>
        <div className="mt-3">
          <label className="text-xs text-gray-500">หมายเหตุค่าใช้จ่ายอื่นๆ</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-brand-100 px-2 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
            value={expense.other_note || ""}
            onChange={(e) => updateExpenseField("other_note", e.target.value)}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-brand-50 pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl2 bg-brand-50 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-200/70 text-brand-700">
              <Wallet className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <div className="text-xs text-gray-500">รวมรายรับ</div>
              <div className="text-xl font-bold text-brand-700">{baht(totals.total)} ฿</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl2 bg-accent-50 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-200/70 text-accent-600">
              <Receipt className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <div className="text-xs text-gray-500">รวมค่าใช้จ่าย</div>
              <div className="text-xl font-bold text-accent-600">{baht(totalExpense)} ฿</div>
            </div>
          </div>
          <div className={`flex items-center gap-3 rounded-xl2 p-3 ${remaining >= 0 ? "bg-sky-50" : "bg-accent-50"}`}>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                remaining >= 0 ? "bg-sky-200/70 text-sky-700" : "bg-accent-200/70 text-accent-600"
              }`}
            >
              <PiggyBank className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <div className="text-xs text-gray-500">คงเหลือ</div>
              <div className={`text-xl font-bold ${remaining >= 0 ? "text-sky-700" : "text-accent-600"}`}>
                {baht(remaining)} ฿
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpenseField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs text-gray-500">
      {label}
      <input
        type="number"
        className="mt-1 block w-full rounded-lg border border-brand-100 px-2 py-1.5 text-right text-sm focus:border-brand-400 focus:outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
