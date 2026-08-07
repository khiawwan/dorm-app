"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, LayoutDashboard, ClipboardList } from "lucide-react";
import { MANAGE_TABS, DEFAULT_MANAGE_TAB } from "@/lib/manageTabs";

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isManage = pathname === "/manage";
  const currentTab = searchParams.get("tab") || DEFAULT_MANAGE_TAB;
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  function manageTabHref(key: string) {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    params.set("tab", key);
    return `/manage?${params.toString()}`;
  }

  return (
    <aside className="no-print sticky top-0 z-20 flex h-screen w-16 shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/10 bg-gradient-to-b from-brand-500 to-brand-700 py-4 text-white shadow-md md:w-60 md:px-3">
      <div className="mb-4 flex items-center justify-center gap-2.5 px-1 md:justify-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2 bg-white/20 backdrop-blur-sm">
          <Building2 className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="hidden text-base font-semibold leading-tight tracking-tight md:inline">
          หอพัก
          <br />
          เขียวหวาน
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-2 md:px-0">
        <Link
          href="/"
          title="หน้าแรก"
          className={`flex items-center justify-center gap-3 rounded-xl2 px-0 py-2.5 text-sm font-medium transition md:justify-start md:px-3 ${
            pathname === "/" ? "bg-white text-brand-700 shadow-sm" : "text-white/90 hover:bg-white/15"
          }`}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          <span className="hidden md:inline">หน้าแรก</span>
        </Link>

        <Link
          href="/manage"
          title="จัดการข้อมูล"
          className={`flex items-center justify-center gap-3 rounded-xl2 px-0 py-2.5 text-sm font-medium transition md:justify-start md:px-3 ${
            isManage ? "bg-white text-brand-700 shadow-sm" : "text-white/90 hover:bg-white/15"
          }`}
        >
          <ClipboardList className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          <span className="hidden md:inline">จัดการข้อมูล</span>
        </Link>

        <div className="mt-0.5 flex flex-col gap-0.5 border-l border-white/20 pl-2 md:ml-4">
          {MANAGE_TABS.map((t) => {
            const Icon = t.icon;
            const active = isManage && currentTab === t.key;
            return (
              <Link
                key={t.key}
                href={manageTabHref(t.key)}
                title={t.label}
                className={`flex items-center justify-center gap-2.5 rounded-xl2 px-0 py-2 text-xs font-medium transition md:justify-start md:px-2.5 ${
                  active ? "bg-white/95 text-brand-700 shadow-sm" : "text-white/75 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                <span className="hidden md:inline">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
