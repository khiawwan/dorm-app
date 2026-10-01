"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex shrink-0 items-center whitespace-nowrap gap-1.5 rounded-xl2 border border-accent-200 bg-white px-3 py-2 text-sm font-medium text-accent-600 shadow-sm transition hover:bg-accent-50"
    >
      <LogOut className="h-4 w-4" strokeWidth={2.25} />
      ออกจากระบบ
    </button>
  );
}
