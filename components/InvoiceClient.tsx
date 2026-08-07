"use client";

import { useMemo, useState } from "react";
import { Printer, Receipt, Building2 } from "lucide-react";
import { baht } from "@/lib/format";
import { elecCost, elecUnits, recordTotal, Room, RoomRecord, Tenant, waterCost, waterUnits } from "@/lib/types";

function tenantName(tenant: Tenant | undefined): string {
  if (!tenant) return "";
  const full = [tenant.first_name, tenant.last_name].filter(Boolean).join(" ");
  if (full && tenant.nickname) return `${full} (${tenant.nickname})`;
  return full || tenant.nickname || "";
}

export default function InvoiceClient({
  rooms,
  records,
  tenants,
  monthLabel,
}: {
  rooms: Room[];
  records: RoomRecord[];
  tenants: Tenant[];
  monthLabel: string;
}) {
  const billableRooms = rooms.filter((r) => !r.is_owner);
  const [roomId, setRoomId] = useState<number | null>(billableRooms[0]?.id ?? null);

  const record = useMemo(() => records.find((r) => r.room_id === roomId), [records, roomId]);
  const tenant = useMemo(() => tenants.find((t) => t.room_id === roomId), [tenants, roomId]);
  const room = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Receipt className="h-5 w-5 text-brand-600" strokeWidth={2.25} />
            ใบแจ้งค่าเช่า
          </h2>
          <p className="text-xs text-gray-500">เลือกห้องเพื่อดูและพิมพ์ใบแจ้งค่าเช่าประจำเดือน{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roomId ?? ""}
            onChange={(e) => setRoomId(Number(e.target.value))}
            className="rounded-xl2 border border-brand-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none"
          >
            {billableRooms.map((r) => (
              <option key={r.id} value={r.id}>
                ห้อง {r.code}
              </option>
            ))}
          </select>
          <button
            onClick={handlePrint}
            disabled={!record}
            className="flex items-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" strokeWidth={2.25} />
            พิมพ์
          </button>
        </div>
      </div>

      {!record ? (
        <div className="rounded-xl2 border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-400">
          ยังไม่มีข้อมูลเดือนนี้สำหรับห้อง {room?.code}
        </div>
      ) : (
        <div id="invoice-print-area" className="mx-auto w-full max-w-xl rounded-xl2 border border-brand-100 bg-white p-8 shadow-soft print:border-0 print:shadow-none">
          <div className="flex items-center gap-3 border-b border-dashed border-gray-200 pb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl2 bg-brand-100 text-brand-700">
              <Building2 className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div>
              <div className="text-lg font-bold text-gray-800">หอพักเขียวหวาน</div>
              <div className="text-xs text-gray-500">ใบแจ้งค่าเช่า</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">ห้อง:</span> <span className="font-semibold">{record.room_code}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500">ประจำเดือน:</span> <span className="font-semibold">{monthLabel}</span>
            </div>
            {tenantName(tenant) && (
              <div className="col-span-2">
                <span className="text-gray-500">ผู้เช่า:</span> <span className="font-semibold">{tenantName(tenant)}</span>
              </div>
            )}
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">รายการ</th>
                <th className="py-2 text-right">จำนวนหน่วย</th>
                <th className="py-2 text-right">ราคา/หน่วย</th>
                <th className="py-2 text-right">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2">ค่าเช่าห้อง</td>
                <td className="py-2 text-right text-gray-400">-</td>
                <td className="py-2 text-right text-gray-400">-</td>
                <td className="py-2 text-right">{baht(record.rent)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">ค่าไฟฟ้า</td>
                <td className="py-2 text-right">{elecUnits(record)}</td>
                <td className="py-2 text-right">{record.elec_rate}</td>
                <td className="py-2 text-right">{baht(elecCost(record))}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">ค่าน้ำประปา</td>
                <td className="py-2 text-right">{waterUnits(record)}</td>
                <td className="py-2 text-right">{record.water_rate}</td>
                <td className="py-2 text-right">{baht(waterCost(record))}</td>
              </tr>
              <tr>
                <td colSpan={3} className="py-3 text-right text-base font-bold">
                  รวมทั้งสิ้น
                </td>
                <td className="py-3 text-right text-base font-bold text-brand-700">{baht(recordTotal(record))} ฿</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-200 pt-4 text-sm">
            <div>
              <span className="text-gray-500">สถานะการชำระ:</span>{" "}
              <span className="font-semibold">{record.payment_status}</span>
            </div>
            {record.payment_date && (
              <div>
                <span className="text-gray-500">วันที่ชำระ:</span>{" "}
                <span className="font-semibold">{record.payment_date}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
