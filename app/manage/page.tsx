import { ClipboardList } from "lucide-react";
import { getMonthExpense, getMonthRecords, getMonthRecordsReadOnly, getRoomDetails, getTenants, listRooms } from "@/lib/db";
import { currentBEYear, currentMonth } from "@/lib/format";
import { MonthlyExpense, Room, RoomRecord, RoomWithItems, RoomWithTenant, Tenant, THAI_MONTHS } from "@/lib/types";
import { DEFAULT_MANAGE_TAB, MANAGE_TABS } from "@/lib/manageTabs";
import YearMonthPicker from "@/components/YearMonthPicker";
import ManageClient from "@/components/ManageClient";
import RoomSettingsClient from "@/components/RoomSettingsClient";
import RoomDetailsClient from "@/components/RoomDetailsClient";
import TenantClient from "@/components/TenantClient";
import InvoiceClient from "@/components/InvoiceClient";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || currentBEYear();
  const month = Number(sp.month) || currentMonth();
  const tab = MANAGE_TABS.some((t) => t.key === sp.tab) ? (sp.tab as string) : DEFAULT_MANAGE_TAB;
  const monthLabel = `${THAI_MONTHS[month - 1]} ${year}`;

  let tenants: RoomWithTenant[] | null = null;
  let records: RoomRecord[] | null = null;
  let expense: MonthlyExpense | null = null;
  let rooms: Room[] | null = null;
  let roomDetails: RoomWithItems[] | null = null;
  let invoiceRooms: Room[] | null = null;
  let invoiceTenants: Tenant[] | null = null;

  if (tab === "tenants") {
    tenants = await getTenants();
  } else if (tab === "records") {
    [records, expense] = await Promise.all([getMonthRecords(year, month), getMonthExpense(year, month)]);
  } else if (tab === "rooms") {
    rooms = await listRooms(true);
  } else if (tab === "details") {
    roomDetails = await getRoomDetails();
  } else if (tab === "invoice") {
    const [invRecords, invRooms, invTenants] = await Promise.all([
      getMonthRecordsReadOnly(year, month),
      listRooms(false),
      getTenants(),
    ]);
    records = invRecords;
    invoiceRooms = invRooms;
    invoiceTenants = invTenants.map((r) => r.tenant);
  }

  const currentTabInfo = MANAGE_TABS.find((t) => t.key === tab);

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-accent-100 text-accent-600">
            <ClipboardList className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">จัดการข้อมูลหอพัก</h1>
            <p className="text-sm text-gray-500">{currentTabInfo?.label || "สำหรับเจ้าของหอพัก"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(tab === "records" || tab === "invoice") && <YearMonthPicker year={year} month={month} />}
          <LogoutButton />
        </div>
      </div>

      {tab === "tenants" && tenants && <TenantClient initialRooms={tenants} />}

      {tab === "records" && records && expense && (
        <ManageClient
          year={year}
          month={month}
          monthLabel={monthLabel}
          initialRecords={records}
          initialExpense={expense}
        />
      )}

      {tab === "rooms" && rooms && <RoomSettingsClient initialRooms={rooms} />}

      {tab === "details" && roomDetails && <RoomDetailsClient initialRooms={roomDetails} />}

      {tab === "invoice" && records && invoiceRooms && invoiceTenants && (
        <InvoiceClient rooms={invoiceRooms} records={records} tenants={invoiceTenants} monthLabel={monthLabel} />
      )}
    </div>
  );
}
