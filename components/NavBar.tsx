"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, ClipboardList } from "lucide-react";

const links = [
  { href: "/", label: "หน้าแรก", icon: LayoutDashboard },
  { href: "/manage", label: "จัดการข้อมูล", icon: ClipboardList },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl2 bg-white/20 backdrop-blur-sm">
            <Building2 className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <span className="text-lg font-semibold tracking-tight">หอพักเขียวหวาน</span>
        </div>
        <nav className="flex gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 rounded-xl2 px-3.5 py-2 text-sm font-medium transition sm:px-4 ${
                  active ? "bg-white text-brand-700 shadow-sm" : "text-white/90 hover:bg-white/15"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
