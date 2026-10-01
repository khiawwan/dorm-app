import { Loader2 } from "lucide-react";

export default function ManageLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-brand-600 motion-reduce:animate-none" />
      <p className="text-lg font-medium text-gray-800">กำลังโหลดหน้าจัดการ…</p>
      <p className="text-sm text-gray-500">กำลังเตรียมข้อมูลหอพัก กรุณารอสักครู่</p>
    </div>
  );
}
