import Link from "next/link";
import {
  LayoutDashboard,
  DoorOpen,
  BarChart3,
  Table2,
  ArrowRight,
} from "lucide-react";
import { getMonthRecordsReadOnly, listRooms } from "@/lib/db";
import { getMonthSummary, getYearSummary } from "@/lib/summary";
import { currentBEYear, currentMonth } from "@/lib/format";
import { THAI_MONTHS } from "@/lib/types";
import YearMonthPicker from "@/components/YearMonthPicker";
import SummaryCards from "@/components/SummaryCards";
import RoomStatusGrid from "@/components/RoomStatusGrid";
import YearlyTable from "@/components/YearlyTable";
import MonthlyBarChart from "@/components/MonthlyBarChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const year =
    Number.isInteger(Number(sp.year)) &&
    Number(sp.year) >= 2500 &&
    Number(sp.year) <= 2700
      ? Number(sp.year)
      : currentBEYear();
  const month =
    Number.isInteger(Number(sp.month)) &&
    Number(sp.month) >= 1 &&
    Number(sp.month) <= 12
      ? Number(sp.month)
      : currentMonth();

  const [monthSummary, yearSummary, records, rooms] = await Promise.all([
    getMonthSummary(year, month),
    getYearSummary(year),
    getMonthRecordsReadOnly(year, month),
    listRooms(false),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="dashboard-hero no-print">
        <div>
          <p className="mb-3 text-xs font-medium tracking-[0.2em] text-emerald-200">
            khiawwan RESIDENCE
          </p>
          <h2 className="text-2xl font-semibold leading-relaxed sm:text-3xl">
            ดูแลหอพักได้อย่างสบายใจ
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            ภาพรวมค่าเช่า ห้องพัก และรายจ่าย ในที่เดียว
          </p>
        </div>
        <Link
          href={`/manage?tab=reports&year=${year}&month=${month}`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-900 sm:mt-0"
        >
          รายงานและยอดค้าง <ArrowRight size={16} />
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-brand-100 text-brand-700">
            <LayoutDashboard className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              แดชบอร์ดสรุปข้อมูล
            </h1>
            <p className="text-sm text-gray-500">
              {THAI_MONTHS[month - 1]} ปี {year}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <YearMonthPicker year={year} month={month} />
          <Link
            href="/manage"
            className="flex items-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            จัดการข้อมูล
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <SummaryCards summary={monthSummary} />

      <section className="rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
          <DoorOpen className="h-5 w-5 text-brand-600" strokeWidth={2.25} />
          สถานะห้องพัก เดือน{THAI_MONTHS[month - 1]}
        </h2>
        <RoomStatusGrid rooms={rooms} records={records} />
      </section>

      <section className="rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
          <BarChart3 className="h-5 w-5 text-brand-600" strokeWidth={2.25} />
          กราฟรายรับ-รายจ่ายรายเดือน ปี {year}
        </h2>
        <MonthlyBarChart data={yearSummary} />
      </section>

      <section className="rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Table2 className="h-5 w-5 text-brand-600" strokeWidth={2.25} />
          สรุปรายเดือน ปี {year}
        </h2>
        <YearlyTable data={yearSummary} />
      </section>
    </div>
  );
}
