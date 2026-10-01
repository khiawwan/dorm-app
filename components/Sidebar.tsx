"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, LayoutDashboard, ArrowUpRight } from "lucide-react";
import { MANAGE_TABS, DEFAULT_MANAGE_TAB } from "@/lib/manageTabs";

export default function Sidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("tab") || DEFAULT_MANAGE_TAB;
  function href(key: string) {
    const next = new URLSearchParams();
    for (const field of ["year", "month"]) {
      const value = params.get(field);
      if (value) next.set(field, value);
    }
    next.set("tab", key);
    return `/manage?${next}`;
  }
  const linkClass = (active: boolean) =>
    `flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`;
  return (
    <aside className="no-print z-20 flex shrink-0 flex-col border-b border-white/10 bg-[#102d2a] p-4 text-white md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:p-5">
      <Link
        href="/"
        className="mb-4 flex items-center gap-3 px-2 md:mb-10 md:mt-3"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300 text-slate-900">
          <Building2 size={24} />
        </span>
        <span className="font-semibold">
          เขียวหวาน
          <span className="mt-1 block text-[10px] font-normal tracking-[0.15em] text-slate-400">
            RESIDENCE MANAGEMENT
          </span>
        </span>
      </Link>
      <p className="mb-3 hidden px-3 text-[10px] tracking-widest text-slate-500 md:block">
        พื้นที่จัดการ
      </p>
      <nav
        aria-label="เมนูหลัก"
        className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-y-auto"
      >
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className={linkClass(pathname === "/")}
        >
          <LayoutDashboard size={18} />
          ภาพรวม
        </Link>
        {MANAGE_TABS.map((t) => {
          const active = pathname === "/manage" && current === t.key;
          return (
            <Link
              key={t.key}
              href={href(t.key)}
              aria-current={active ? "page" : undefined}
              className={linkClass(active)}
            >
              <t.icon size={18} />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden border-t border-white/10 pt-5 md:block">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-slate-200">จัดการได้ในที่เดียว</p>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            ข้อมูลผู้เช่า บันทึกค่าใช้จ่าย
            <br />
            และใบแจ้งค่าเช่ารายเดือน
          </p>
          <Link
            href={href("invoice")}
            className="mt-3 flex items-center gap-2 text-xs text-emerald-200"
          >
            ออกใบแจ้งค่าเช่า <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
