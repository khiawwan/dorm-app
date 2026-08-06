import Link from "next/link";
import { ClipboardList, NotebookPen, Settings2, Images } from "lucide-react";
import { getMonthExpense, getMonthRecords, getRoomDetails, listRooms } from "@/lib/db";
import { currentBEYear, currentMonth } from "@/lib/format";
import { MonthlyExpense, Room, RoomRecord, RoomWithItems, THAI_MONTHS } from "@/lib/types";
import YearMonthPicker from "@/components/YearMonthPicker";
import ManageClient from "@/components/ManageClient";
import RoomSettingsClient from "@/components/RoomSettingsClient";
import RoomDetailsClient from "@/components/RoomDetailsClient";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "records", label: "บันทึกรายเดือน", icon: NotebookPen },
  { key: "rooms", label: "ตั้งค่าห้องพัก", icon: Settings2 },
  { key: "details", label: "รายละเอียดห้องพัก", icon: Images },
] as const;

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || currentBEYear();
  const month = Number(sp.month) || currentMonth();
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as (typeof TABS)[number]["key"]) : "records";

  let records: RoomRecord[] | null = null;
  let expense: MonthlyExpense | null = null;
  let rooms: Room[] | null = null;
  let roomDetails: RoomWithItems[] | null = null;

  if (tab === "records") {
    [records, expense] = await Promise.all([getMonthRecords(year, month), getMonthExpense(year, month)]);
  } else if (tab === "rooms") {
    rooms = await listRooms(true);
  } else if (tab === "details") {
    roomDetails = await getRoomDetails();
  }

  const tabLink = (t: string) => {
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("month", String(month));
    params.set("tab", t);
    return `/manage?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-accent-100 text-accent-600">
            <ClipboardList className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">จัดการข้อมูลหอพัก</h1>
            <p className="text-sm text-gray-500">สำหรับเจ้าของหอพัก แก้ไขข้อมูลได้ทุกช่อง บันทึกอัตโนมัติ</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tab === "records" && <YearMonthPicker year={year} month={month} />}
          <LogoutButton />
        </div>
      </div>

      <div className="flex gap-1 rounded-xl2 border border-brand-100 bg-white p-1.5 shadow-soft">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={tabLink(t.key)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                active ? "bg-brand-600 text-white shadow-sm" : "text-gray-500 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
              {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "records" && records && expense && (
        <ManageClient
          year={year}
          month={month}
          monthLabel={`${THAI_MONTHS[month - 1]} ${year}`}
          initialRecords={records}
          initialExpense={expense}
        />
      )}
      {tab === "rooms" && rooms && <RoomSettingsClient initialRooms={rooms} />}
      {tab === "details" && roomDetails && <RoomDetailsClient initialRooms={roomDetails} />}
    </div>
  );
}
