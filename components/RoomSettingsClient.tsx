"use client";

import { useRef, useState } from "react";
import { Settings2, Plus, Trash2 } from "lucide-react";
import { Room } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved";

export default function RoomSettingsClient({ initialRooms }: { initialRooms: Room[] }) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [saveState, setSaveState] = useState<Record<number, SaveState>>({});
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function debounced(id: number, fn: () => void) {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(fn, 600);
  }

  function saveRoom(room: Room) {
    setSaveState((s) => ({ ...s, [room.id]: "saving" }));
    fetch(`/api/rooms/${room.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(room),
    })
      .then(() => {
        setSaveState((s) => ({ ...s, [room.id]: "saved" }));
        setTimeout(() => setSaveState((s) => ({ ...s, [room.id]: "idle" })), 1500);
      })
      .catch(() => setSaveState((s) => ({ ...s, [room.id]: "idle" })));
  }

  function updateField<K extends keyof Room>(id: number, field: K, value: Room[K]) {
    setRooms((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      const updated = next.find((r) => r.id === id);
      if (updated) debounced(id, () => saveRoom(updated));
      return next;
    });
  }

  async function addRoom() {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: `NEW${rooms.length + 1}`, floor: "F", default_rent: 0, is_owner: 0 }),
    });
    const room = await res.json();
    setRooms((prev) => [...prev, room]);
  }

  async function removeRoom(id: number, code: string) {
    if (!confirm(`ลบห้อง ${code}? ข้อมูลบันทึกรายเดือนของห้องนี้ทั้งหมดจะถูกลบไปด้วย`)) return;
    await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="rounded-xl2 border border-brand-100 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Settings2 className="h-5 w-5 text-brand-600" strokeWidth={2.25} />
            รายการห้องพัก
          </h2>
          <p className="text-xs text-gray-500">แก้ไขรหัสห้อง ชั้น ค่าเช่าเริ่มต้น และสถานะการใช้งาน</p>
        </div>
        <button
          onClick={addRoom}
          className="flex items-center gap-1.5 rounded-xl2 bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          เพิ่มห้อง
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-brand-50 text-xs text-brand-800">
            <tr>
              <th className="px-2 py-2.5">ลำดับ</th>
              <th className="px-2 py-2.5">รหัสห้อง</th>
              <th className="px-2 py-2.5">ชั้น</th>
              <th className="px-2 py-2.5">ค่าเช่าเริ่มต้น</th>
              <th className="px-2 py-2.5">เจ้าของหอ</th>
              <th className="px-2 py-2.5">เปิดใช้งาน</th>
              <th className="px-2 py-2.5"></th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className={`border-t border-brand-50 ${r.is_owner ? "bg-violet-50" : "hover:bg-brand-50/40"}`}>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    className="w-16 rounded-lg border border-brand-100 px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
                    value={r.sort_order}
                    onChange={(e) => updateField(r.id, "sort_order", Number(e.target.value))}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    className="w-24 rounded-lg border border-brand-100 px-2 py-1 text-sm focus:border-brand-400 focus:outline-none"
                    value={r.code}
                    onChange={(e) => updateField(r.id, "code", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">
                  <select
                    className="rounded-lg border border-brand-100 px-2 py-1 text-sm focus:border-brand-400 focus:outline-none"
                    value={r.floor}
                    onChange={(e) => updateField(r.id, "floor", e.target.value)}
                  >
                    <option value="F">F</option>
                    <option value="L">L</option>
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    className="w-28 rounded-lg border border-brand-100 px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
                    value={r.default_rent}
                    onChange={(e) => updateField(r.id, "default_rent", Number(e.target.value))}
                  />
                </td>
                <td className="px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-violet-500"
                    checked={!!r.is_owner}
                    onChange={(e) => updateField(r.id, "is_owner", e.target.checked ? 1 : 0)}
                  />
                </td>
                <td className="px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-500"
                    checked={!!r.active}
                    onChange={(e) => updateField(r.id, "active", e.target.checked ? 1 : 0)}
                  />
                </td>
                <td className="px-2 py-1 text-xs">
                  {saveState[r.id] === "saving" && <span className="text-amber-500">กำลังบันทึก…</span>}
                  {saveState[r.id] === "saved" && <span className="text-brand-600">✓ บันทึกแล้ว</span>}
                </td>
                <td className="px-2 py-1">
                  <button
                    onClick={() => removeRoom(r.id, r.code)}
                    className="flex items-center gap-1 rounded-lg border border-accent-200 px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
