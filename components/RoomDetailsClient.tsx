"use client";

import { useRef, useState } from "react";
import { ImagePlus, ImageOff, Trash2, Plus, Crown, Loader2 } from "lucide-react";
import { RoomItem, RoomWithItems } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved";

const SUGGESTIONS = ["เตียงนอน", "ตู้เสื้อผ้า", "พัดลม", "ทีวี", "แอร์", "โต๊ะ", "เก้าอี้", "ตู้เย็น"];

export default function RoomDetailsClient({ initialRooms }: { initialRooms: RoomWithItems[] }) {
  const [rooms, setRooms] = useState<RoomWithItems[]>(initialRooms);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [saveState, setSaveState] = useState<Record<number, SaveState>>({});
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  function debounced(key: number, fn: () => void) {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, 600);
  }

  function markSaving(itemId: number) {
    setSaveState((s) => ({ ...s, [itemId]: "saving" }));
  }
  function markSaved(itemId: number) {
    setSaveState((s) => ({ ...s, [itemId]: "saved" }));
    setTimeout(() => setSaveState((s) => ({ ...s, [itemId]: "idle" })), 1200);
  }

  async function handlePhotoSelect(roomId: number, file: File) {
    setUploading((s) => ({ ...s, [roomId]: true }));
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/rooms/${roomId}/photo`, { method: "POST", body: form });
      if (res.ok) {
        const updated = await res.json();
        setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, photo_path: updated.photo_path } : r)));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "อัปโหลดรูปไม่สำเร็จ");
      }
    } finally {
      setUploading((s) => ({ ...s, [roomId]: false }));
    }
  }

  async function handleRemovePhoto(roomId: number) {
    setUploading((s) => ({ ...s, [roomId]: true }));
    try {
      const res = await fetch(`/api/rooms/${roomId}/photo`, { method: "DELETE" });
      if (res.ok) {
        setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, photo_path: null } : r)));
      }
    } finally {
      setUploading((s) => ({ ...s, [roomId]: false }));
    }
  }

  async function addItem(roomId: number, name: string) {
    const res = await fetch("/api/room-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId, name, quantity: 1 }),
    });
    if (!res.ok) return;
    const item: RoomItem = await res.json();
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, items: [...r.items, item] } : r)));
  }

  function saveItem(item: RoomItem) {
    markSaving(item.id);
    fetch(`/api/room-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        sort_order: item.sort_order,
      }),
    })
      .then(() => markSaved(item.id))
      .catch(() => setSaveState((s) => ({ ...s, [item.id]: "idle" })));
  }

  function updateItemField<K extends keyof RoomItem>(roomId: number, itemId: number, field: K, value: RoomItem[K]) {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const items = r.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it));
        const updated = items.find((it) => it.id === itemId);
        if (updated) debounced(itemId, () => saveItem(updated));
        return { ...r, items };
      })
    );
  }

  async function removeItem(roomId: number, itemId: number) {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, items: r.items.filter((it) => it.id !== itemId) } : r)));
    await fetch(`/api/room-items/${itemId}`, { method: "DELETE" });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => (
        <div key={room.id} className="flex flex-col overflow-hidden rounded-xl2 border border-brand-100 bg-white shadow-soft">
          <div className="relative aspect-video w-full bg-brand-50">
            {room.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={room.photo_path} alt={`ห้อง ${room.code}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-brand-300">
                <ImagePlus className="h-9 w-9" strokeWidth={1.5} />
                <span className="text-xs">ยังไม่มีรูปห้อง</span>
              </div>
            )}

            {uploading[room.id] && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            )}

            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-700 shadow-sm">
              {room.is_owner ? <Crown className="h-3.5 w-3.5 text-violet-500" /> : null}
              {room.code}
            </div>

            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <input
                ref={(el) => {
                  fileInputs.current[room.id] = el;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelect(room.id, file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputs.current[room.id]?.click()}
                className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-medium text-brand-700 shadow-sm hover:bg-white"
              >
                <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.25} />
                {room.photo_path ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
              </button>
              {room.photo_path && (
                <button
                  onClick={() => handleRemovePhoto(room.id)}
                  className="flex items-center justify-center rounded-full bg-white/90 p-1.5 text-accent-600 shadow-sm hover:bg-white"
                  title="ลบรูป"
                >
                  <ImageOff className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">ของใช้ในห้อง</h3>
            </div>

            <div className="flex flex-col gap-1.5">
              {room.items.length === 0 && <p className="text-xs text-gray-400">ยังไม่มีรายการ</p>}
              {room.items.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="ชื่อของ"
                    value={item.name}
                    onChange={(e) => updateItemField(room.id, item.id, "name", e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) => updateItemField(room.id, item.id, "quantity", Number(e.target.value))}
                    className="w-14 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-brand-400 focus:outline-none"
                  />
                  <button
                    onClick={() => removeItem(room.id, item.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-accent-50 hover:text-accent-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </button>
                  {saveState[item.id] === "saving" && (
                    <span className="shrink-0 text-[10px] text-amber-500">•</span>
                  )}
                  {saveState[item.id] === "saved" && (
                    <span className="shrink-0 text-[10px] text-brand-600">✓</span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => addItem(room.id, "")}
              className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-brand-200 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              เพิ่มของใช้ในห้อง
            </button>

            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => addItem(room.id, s)}
                  className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-600 hover:bg-accent-100"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
