"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, ClipboardList } from "lucide-react";

const links = [
  { href: "/", label: "หน้าแรก", icon: LayoutDashboard },
  { href: "/manage", label: "จัดการข้อมูล", icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 z-20 flex h-screen w-16 shrink-0 flex-col gap-1 border-r border-white/10 bg-gradient-to-b from-brand-500 to-brand-700 py-4 text-white shadow-md md:w-60 md:px-3">
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
        {links.map((l) => {
          const active = pathname === l.href;
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              title={l.label}
              className={`flex items-center justify-center gap-3 rounded-xl2 px-0 py-2.5 text-sm font-medium transition md:justify-start md:px-3 ${
                active ? "bg-white text-brand-700 shadow-sm" : "text-white/90 hover:bg-white/15"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2.25} />
              <span className="hidden md:inline">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
