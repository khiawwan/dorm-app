"use client";

import { useMemo, useRef, useState } from "react";
import { Printer, Receipt, Building2, Settings2, ImagePlus, ImageOff, Loader2 } from "lucide-react";
import { baht } from "@/lib/format";
import {
  elecCost,
  elecUnits,
  InvoiceSettings,
  recordTotal,
  Room,
  RoomRecord,
  Tenant,
  waterCost,
  waterUnits,
} from "@/lib/types";

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
  initialSettings,
}: {
  rooms: Room[];
  records: RoomRecord[];
  tenants: Tenant[];
  monthLabel: string;
  initialSettings: InvoiceSettings;
}) {
  const billableRooms = rooms.filter((r) => !r.is_owner);
  const [roomId, setRoomId] = useState<number | null>(billableRooms[0]?.id ?? null);
  const [settings, setSettings] = useState<InvoiceSettings>(initialSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const record = useMemo(() => records.find((r) => r.room_id === roomId), [records, roomId]);
  const tenant = useMemo(() => tenants.find((t) => t.room_id === roomId), [tenants, roomId]);
  const room = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);

  function handlePrint() {
    window.print();
  }

  function saveSettings(next: InvoiceSettings) {
    setSavingSettings(true);
    fetch("/api/invoice-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: next.address, footer_note: next.footer_note }),
    })
      .catch(() => {})
      .finally(() => setSavingSettings(false));
  }

  function updateSettingsField<K extends keyof InvoiceSettings>(field: K, value: InvoiceSettings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [field]: value };
      if (settingsTimer.current) clearTimeout(settingsTimer.current);
      settingsTimer.current = setTimeout(() => saveSettings(next), 600);
      return next;
    });
  }

  async function handleQrSelect(file: File) {
    setUploadingQr(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/invoice-settings/qr", { method: "POST", body: form });
      if (res.ok) {
        const updated = await res.json();
        setSettings((prev) => ({ ...prev, qr_path: updated.qr_path }));
      }
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleQrRemove() {
    setUploadingQr(true);
    try {
      const res = await fetch("/api/invoice-settings/qr", { method: "DELETE" });
      if (res.ok) setSettings((prev) => ({ ...prev, qr_path: null }));
    } finally {
      setUploadingQr(false);
    }
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
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl2 border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            <Settings2 className="h-4 w-4" strokeWidth={2.25} />
            ตั้งค่าใบแจ้งหนี้
          </button>
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

      {showSettings && (
        <div className="no-print flex flex-col gap-3 rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">ข้อมูลท้ายใบแจ้งหนี้ (แสดงในใบแจ้งหนี้ทุกใบ)</h3>
            {savingSettings && <span className="text-xs text-amber-500">กำลังบันทึก…</span>}
          </div>
          <label className="text-xs text-gray-500">
            ที่อยู่หอพัก (แสดงด้านบนของใบแจ้งหนี้)
            <textarea
              rows={2}
              className="mt-1 block w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={settings.address || ""}
              onChange={(e) => updateSettingsField("address", e.target.value)}
              placeholder="เช่น 1075 ม.20 ต.นอกเมือง อ.เมือง จ.สุรินทร์ 32000"
            />
          </label>
          <label className="text-xs text-gray-500">
            หมายเหตุ / ช่องทางชำระเงิน (แสดงด้านล่างของใบแจ้งหนี้)
            <textarea
              rows={5}
              className="mt-1 block w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={settings.footer_note || ""}
              onChange={(e) => updateSettingsField("footer_note", e.target.value)}
              placeholder={
                "เช่น\nโอนเข้าบัญชี ธ.กรุงเทพ เลขบัญชี xxx-x-xxxxxx ชื่อบัญชี ...\nโปรดชำระก่อนวันที่ 5 ของทุกเดือน\nหลังวันที่ 7 คิดค่าปรับวันละ 10 บาท\nโอนแล้วส่งสลิปทางไลน์พร้อมแจ้งเลขห้อง Line ID: ..."
              }
            />
          </label>
          <div>
            <div className="mb-1 text-xs text-gray-500">QR โอนเงิน / ไลน์ (แสดงด้านล่างของใบแจ้งหนี้)</div>
            <div className="flex items-center gap-3">
              {settings.qr_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.qr_path} alt="QR ชำระเงิน" className="h-24 w-24 rounded-lg border border-gray-200 object-contain" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300">
                  <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleQrSelect(file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingQr}
                  className="flex items-center gap-1.5 rounded-xl2 border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 shadow-sm hover:bg-brand-50 disabled:opacity-60"
                >
                  {uploadingQr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.25} />}
                  {settings.qr_path ? "เปลี่ยนรูป QR" : "อัปโหลดรูป QR"}
                </button>
                {settings.qr_path && (
                  <button
                    onClick={handleQrRemove}
                    disabled={uploadingQr}
                    className="flex items-center gap-1.5 rounded-xl2 border border-accent-200 bg-white px-3 py-1.5 text-xs font-medium text-accent-600 shadow-sm hover:bg-accent-50 disabled:opacity-60"
                  >
                    <ImageOff className="h-3.5 w-3.5" strokeWidth={2.25} />
                    ลบรูป QR
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!record ? (
        <div className="rounded-xl2 border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-400">
          ยังไม่มีข้อมูลเดือนนี้สำหรับห้อง {room?.code}
        </div>
      ) : (
        <div
          id="invoice-print-area"
          className="mx-auto w-full max-w-xl rounded-xl2 border border-brand-100 bg-white p-8 shadow-soft print:border-0 print:shadow-none"
        >
          <div className="flex items-start gap-3 border-b border-dashed border-gray-200 pb-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl2 bg-brand-100 text-brand-700">
              <Building2 className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div>
              <div className="text-lg font-bold text-gray-800">หอพักเขียวหวาน</div>
              <div className="text-xs text-gray-500">ใบแจ้งค่าเช่า</div>
              {settings.address && (
                <div className="mt-1 whitespace-pre-wrap text-xs text-gray-500">{settings.address}</div>
              )}
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

          {(settings.footer_note || settings.qr_path) && (
            <div className="mt-4 flex items-start justify-between gap-4 border-t border-dashed border-gray-200 pt-4">
              {settings.footer_note && (
                <div className="whitespace-pre-wrap text-xs text-gray-600">{settings.footer_note}</div>
              )}
              {settings.qr_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.qr_path}
                  alt="QR ชำระเงิน"
                  className="h-24 w-24 shrink-0 rounded-lg border border-gray-200 object-contain"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
