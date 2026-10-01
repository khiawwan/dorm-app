"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Search, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { baht } from "@/lib/format";
import { RoomRecord, recordTotal, PAYMENT_STATUS_OPTIONS } from "@/lib/types";

export default function ReportsClient({
  records,
  year,
  month,
}: {
  records: RoomRecord[];
  year: number;
  month: number;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const billable = records.filter(
    (r) => !r.is_owner && r.payment_status !== "ไม่มีผู้เช่า",
  );
  const paid = billable.filter(
    (r) => r.payment_status === "โอน" || r.payment_status === "เงินสด",
  );
  const pending = billable.filter((r) => r.payment_status === "ยังไม่จ่าย");
  const sum = (rows: RoomRecord[]) =>
    rows.reduce((total, r) => total + recordTotal(r), 0);
  const visible = records.filter(
    (r) =>
      `${r.room_code} ${r.room_floor} ${r.note || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!status || r.payment_status === status),
  );
  function download() {
    const cell = (value: string | number) =>
      `"${String(value)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""')}"`;
    const rows = [
      ["ห้อง", "ชั้น", "ยอดตามรายการ", "สถานะ", "วันที่ชำระ", "หมายเหตุ"],
      ...visible.map((r) => [
        r.room_code,
        r.room_floor,
        recordTotal(r),
        r.payment_status,
        r.payment_date || "",
        r.note || "",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8;" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `dorm-report-${year}-${month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "ยอดเรียกเก็บผู้เช่า",
            value: sum(billable),
            icon: Wallet,
            color: "text-slate-800",
          },
          {
            label: `รับชำระแล้ว · ${paid.length} ห้อง`,
            value: sum(paid),
            icon: CheckCircle2,
            color: "text-brand-700",
          },
          {
            label: `รอชำระ · ${pending.length} ห้อง`,
            value: sum(pending),
            icon: Clock,
            color: "text-amber-700",
          },
        ].map((c) => (
          <div className="surface p-5" key={c.label}>
            <c.icon className={`mb-4 h-5 w-5 ${c.color}`} />
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${c.color}`}>
              {baht(c.value)} <span className="text-sm">บาท</span>
            </p>
          </div>
        ))}
      </div>
      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-semibold">ติดตามการชำระเงิน</h2>
            <p className="mt-1 text-xs text-slate-500">
              ยอดสรุปไม่รวมห้องเจ้าของและห้องไม่มีผู้เช่า ·
              รายงานตามเดือนที่เลือก
            </p>
          </div>
          <button onClick={download} className="action-secondary">
            <Download size={16} /> ส่งออก CSV
          </button>
        </div>
        <div className="flex flex-wrap gap-3 p-5">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={17} className="text-slate-400" />
            <input
              aria-label="ค้นหารายการ"
              placeholder="ค้นหาห้อง ชั้น หรือหมายเหตุ"
              className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="กรองสถานะชำระเงิน"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {["ห้อง / ชั้น", "ยอดตามรายการ", "สถานะ", "วันที่ชำระ"].map(
                  (h) => (
                    <th className="px-5 py-3" key={h}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-medium">
                    {r.room_code}{" "}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {r.room_floor}
                      {r.is_owner ? " · เจ้าของหอ" : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4 tabular-nums">
                    {baht(recordTotal(r))} ฿
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${r.payment_status === "ยังไม่จ่าย" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                    >
                      {r.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {r.payment_date || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="p-12 text-center text-sm text-slate-500">
            {records.length
              ? "ไม่พบรายการที่ตรงกับการค้นหา"
              : "ยังไม่มีรายการในเดือนนี้ เริ่มบันทึกข้อมูลรายเดือนเพื่อสร้างรายงาน"}
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 p-5 text-sm">
          <span className="text-slate-500">
            แสดง {visible.length} จาก {records.length} รายการ
          </span>
          <Link
            className="font-medium text-brand-700"
            href={`/manage?tab=records&year=${year}&month=${month}`}
          >
            ไปบันทึกการชำระเงิน →
          </Link>
        </div>
      </section>
    </div>
  );
}
