import { baht } from "@/lib/format";
import { MonthSummary, THAI_MONTHS } from "@/lib/types";

export default function YearlyTable({ data }: { data: MonthSummary[] }) {
  const totals = data.reduce(
    (acc, d) => ({
      total_rent: acc.total_rent + d.total_rent,
      total_elec: acc.total_elec + d.total_elec,
      total_water: acc.total_water + d.total_water,
      total_income: acc.total_income + d.total_income,
      total_expense: acc.total_expense + d.total_expense,
      remaining: acc.remaining + d.remaining,
    }),
    { total_rent: 0, total_elec: 0, total_water: 0, total_income: 0, total_expense: 0, remaining: 0 }
  );

  return (
    <div className="overflow-x-auto rounded-xl2 border border-brand-100 shadow-sm">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-brand-50 text-brand-800">
          <tr>
            <th className="px-3 py-2.5 text-left font-semibold">เดือน</th>
            <th className="px-3 py-2.5 text-right font-semibold">ค่าเช่ารวม</th>
            <th className="px-3 py-2.5 text-right font-semibold">ค่าไฟรวม</th>
            <th className="px-3 py-2.5 text-right font-semibold">ค่าน้ำรวม</th>
            <th className="px-3 py-2.5 text-right font-semibold">รายรับรวม</th>
            <th className="px-3 py-2.5 text-right font-semibold">รายจ่ายรวม</th>
            <th className="px-3 py-2.5 text-right font-semibold">คงเหลือ</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month} className="border-t border-brand-50 hover:bg-brand-50/50">
              <td className="px-3 py-2 font-medium text-gray-700">{THAI_MONTHS[d.month - 1]}</td>
              <td className="px-3 py-2 text-right text-gray-600">{baht(d.total_rent)}</td>
              <td className="px-3 py-2 text-right text-gray-600">{baht(d.total_elec)}</td>
              <td className="px-3 py-2 text-right text-gray-600">{baht(d.total_water)}</td>
              <td className="px-3 py-2 text-right font-semibold text-brand-700">{baht(d.total_income)}</td>
              <td className="px-3 py-2 text-right font-semibold text-accent-600">{baht(d.total_expense)}</td>
              <td className={`px-3 py-2 text-right font-semibold ${d.remaining >= 0 ? "text-sky-700" : "text-accent-600"}`}>
                {baht(d.remaining)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-brand-50/70 font-bold">
          <tr className="border-t border-brand-100">
            <td className="px-3 py-2.5 text-gray-800">รวมทั้งปี</td>
            <td className="px-3 py-2.5 text-right text-gray-700">{baht(totals.total_rent)}</td>
            <td className="px-3 py-2.5 text-right text-gray-700">{baht(totals.total_elec)}</td>
            <td className="px-3 py-2.5 text-right text-gray-700">{baht(totals.total_water)}</td>
            <td className="px-3 py-2.5 text-right text-brand-700">{baht(totals.total_income)}</td>
            <td className="px-3 py-2.5 text-right text-accent-600">{baht(totals.total_expense)}</td>
            <td className={`px-3 py-2.5 text-right ${totals.remaining >= 0 ? "text-sky-700" : "text-accent-600"}`}>
              {baht(totals.remaining)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
