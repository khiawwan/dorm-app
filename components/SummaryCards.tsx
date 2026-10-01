import { Wallet, Receipt, PiggyBank, Users } from "lucide-react";
import { baht } from "@/lib/format";
import { MonthSummary } from "@/lib/types";

export default function SummaryCards({ summary }: { summary: MonthSummary }) {
  const positive = summary.remaining >= 0;
  const cards = [
    {
      label: "ยอดรวมตามรายการ",
      value: summary.total_income,
      icon: Wallet,
      text: "text-brand-700",
      bg: "bg-brand-50",
      iconBg: "bg-brand-200/70 text-brand-700",
    },
    {
      label: "รายจ่ายรวม",
      value: summary.total_expense,
      icon: Receipt,
      text: "text-accent-600",
      bg: "bg-accent-50",
      iconBg: "bg-accent-200/70 text-accent-600",
    },
    {
      label: "ส่วนต่างรายรับ–รายจ่าย",
      value: summary.remaining,
      icon: PiggyBank,
      text: positive ? "text-sky-700" : "text-accent-600",
      bg: positive ? "bg-sky-50" : "bg-accent-50",
      iconBg: positive
        ? "bg-sky-200/70 text-sky-700"
        : "bg-accent-200/70 text-accent-600",
    },
    {
      label: `ห้องมีผู้เช่า (${summary.occupied_rooms})`,
      value: null,
      sub: `จ่ายแล้ว ${summary.paid_rooms} · ค้างจ่าย ${summary.unpaid_rooms}`,
      icon: Users,
      text: "text-violet-700",
      bg: "bg-violet-50",
      iconBg: "bg-violet-200/70 text-violet-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={`rounded-xl2 border border-slate-200/80 bg-white p-5 shadow-soft`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${c.iconBg}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="text-xs font-medium text-gray-500">{c.label}</div>
            </div>
            {c.value !== null ? (
              <div
                className={`mt-2 text-xl font-semibold lg:text-2xl ${c.text}`}
              >
                {baht(c.value)} ฿
              </div>
            ) : (
              <div className={`mt-2 text-sm font-semibold ${c.text}`}>
                {c.sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
