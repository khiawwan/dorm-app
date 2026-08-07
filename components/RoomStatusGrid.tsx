import { CheckCircle2, Clock, DoorClosed, Crown, HelpCircle } from "lucide-react";
import { baht } from "@/lib/format";
import { recordTotal, Room, RoomRecord } from "@/lib/types";

function statusStyle(status: string, isOwner: number) {
  if (isOwner) return { card: "bg-violet-100 text-violet-800 border-violet-200", icon: Crown };
  if (status === "โอน" || status === "เงินสด")
    return { card: "bg-brand-100 text-brand-800 border-brand-200", icon: CheckCircle2 };
  if (status === "ไม่มีผู้เช่า") return { card: "bg-gray-100 text-gray-500 border-gray-200", icon: DoorClosed };
  return { card: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock };
}

export default function RoomStatusGrid({ rooms, records }: { rooms: Room[]; records: RoomRecord[] }) {
  const byRoomId = new Map(records.map((r) => [r.room_id, r]));

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
      {rooms.map((room) => {
        const r = byRoomId.get(room.id);

        if (!r) {
          return (
            <div
              key={room.id}
              className="rounded-xl2 border border-dashed border-gray-200 bg-gray-50 p-3 text-center text-gray-400"
            >
              <div className="flex items-center justify-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
                <span className="text-sm font-bold">{room.code}</span>
              </div>
              <div className="mt-1 text-xs">ยังไม่มีข้อมูล</div>
            </div>
          );
        }

        const { card, icon: Icon } = statusStyle(r.payment_status, r.is_owner);
        return (
          <div key={r.id} className={`rounded-xl2 border p-3 text-center shadow-sm ${card}`}>
            <div className="flex items-center justify-center gap-1">
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span className="text-sm font-bold">{r.room_code}</span>
            </div>
            <div className="mt-1 text-xs">{r.is_owner ? "เจ้าของหอ" : r.payment_status}</div>
            {!r.is_owner && <div className="mt-1 text-xs font-semibold">{baht(recordTotal(r))} ฿</div>}
          </div>
        );
      })}
    </div>
  );
}
