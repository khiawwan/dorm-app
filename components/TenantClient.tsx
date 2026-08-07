"use client";

import { useRef, useState } from "react";
import { Users, Crown } from "lucide-react";
import { RoomWithTenant, Tenant } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved";

export default function TenantClient({ initialRooms }: { initialRooms: RoomWithTenant[] }) {
  const [rooms, setRooms] = useState<RoomWithTenant[]>(initialRooms);
  const [saveState, setSaveState] = useState<Record<number, SaveState>>({});
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function debounced(tenantId: number, fn: () => void) {
    if (timers.current[tenantId]) clearTimeout(timers.current[tenantId]);
    timers.current[tenantId] = setTimeout(fn, 600);
  }

  function saveTenant(tenant: Tenant) {
    setSaveState((s) => ({ ...s, [tenant.id]: "saving" }));
    fetch(`/api/tenants/${tenant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: tenant.first_name,
        last_name: tenant.last_name,
        nickname: tenant.nickname,
        phone: tenant.phone,
        address: tenant.address,
      }),
    })
      .then(() => {
        setSaveState((s) => ({ ...s, [tenant.id]: "saved" }));
        setTimeout(() => setSaveState((s) => ({ ...s, [tenant.id]: "idle" })), 1500);
      })
      .catch(() => setSaveState((s) => ({ ...s, [tenant.id]: "idle" })));
  }

  function updateField<K extends keyof Tenant>(roomId: number, field: K, value: Tenant[K]) {
    setRooms((prev) => {
      const next = prev.map((r) => (r.id === roomId ? { ...r, tenant: { ...r.tenant, [field]: value } } : r));
      const updated = next.find((r) => r.id === roomId);
      if (updated) debounced(updated.tenant.id, () => saveTenant(updated.tenant));
      return next;
    });
  }

  const inputCls =
    "w-full min-w-[100px] rounded-lg border border-brand-100 bg-white px-2 py-1.5 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Users className="h-5 w-5 text-brand-600" strokeWidth={2.25} />
          ข้อมูลผู้เช่า
        </h2>
        <p className="text-xs text-gray-500">แก้ไขข้อมูลแล้วระบบจะบันทึกให้อัตโนมัติ</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-brand-50 text-xs text-brand-800">
            <tr>
              <th className="px-2 py-2.5">ห้อง</th>
              <th className="px-2 py-2.5">ชื่อ</th>
              <th className="px-2 py-2.5">นามสกุล</th>
              <th className="px-2 py-2.5">ชื่อเล่น</th>
              <th className="px-2 py-2.5">เบอร์โทร</th>
              <th className="px-2 py-2.5">ที่อยู่</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const state = saveState[room.tenant.id] || "idle";
              return (
                <tr key={room.id} className={`border-t border-brand-50 ${room.is_owner ? "bg-violet-50" : "hover:bg-brand-50/40"}`}>
                  <td className="px-2 py-1 text-center font-bold text-gray-700">
                    <div className="flex items-center justify-center gap-1">
                      {room.is_owner ? <Crown className="h-3.5 w-3.5 text-violet-500" /> : null}
                      {room.code}
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      className={inputCls}
                      value={room.tenant.first_name || ""}
                      onChange={(e) => updateField(room.id, "first_name", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      className={inputCls}
                      value={room.tenant.last_name || ""}
                      onChange={(e) => updateField(room.id, "last_name", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      className={inputCls}
                      value={room.tenant.nickname || ""}
                      onChange={(e) => updateField(room.id, "nickname", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      className={inputCls}
                      value={room.tenant.phone || ""}
                      onChange={(e) => updateField(room.id, "phone", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      className={`${inputCls} min-w-[180px]`}
                      value={room.tenant.address || ""}
                      onChange={(e) => updateField(room.id, "address", e.target.value)}
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
        </table>
      </div>
    </div>
  );
}
