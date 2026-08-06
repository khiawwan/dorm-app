"use client";

import { useRouter, usePathname } from "next/navigation";
import { THAI_MONTHS } from "@/lib/types";

export default function YearMonthPicker({
  year,
  month,
  showMonth = true,
}: {
  year: number;
  month?: number;
  showMonth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function go(nextYear: number, nextMonth?: number) {
    const params = new URLSearchParams();
    params.set("year", String(nextYear));
    if (showMonth && nextMonth) params.set("month", String(nextMonth));
    router.push(`${pathname}?${params.toString()}`);
  }

  const years = Array.from({ length: 6 }, (_, i) => year - 3 + i);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
        className="rounded-xl2 border border-brand-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            ปี {y}
          </option>
        ))}
      </select>
      {showMonth && month && (
        <select
          value={month}
          onChange={(e) => go(year, Number(e.target.value))}
          className="rounded-xl2 border border-brand-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          {THAI_MONTHS.map((name, idx) => (
            <option key={name} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
