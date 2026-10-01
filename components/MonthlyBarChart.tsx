import { MonthSummary, THAI_MONTHS } from "@/lib/types";

export default function MonthlyBarChart({ data }: { data: MonthSummary[] }) {
  if (!data.some((d) => d.total_income !== 0 || d.total_expense !== 0)) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl bg-slate-50 p-6 text-center">
        <p className="font-medium text-slate-600">
          ยังไม่มียอดรายรับ–รายจ่ายในปีนี้
        </p>
        <p className="mt-2 text-sm text-slate-400">
          กราฟจะแสดงเมื่อมีการบันทึกรายการรายเดือน
        </p>
      </div>
    );
  }
  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.total_income, d.total_expense)),
  );
  const width = 900;
  const height = 260;
  const padding = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const groupW = chartW / data.length;
  const barW = Math.min(18, groupW / 3);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[720px]"
        role="img"
        aria-label="กราฟรายรับรายจ่ายรายเดือน"
      >
        {data.map((d, i) => {
          const x = padding.left + i * groupW + groupW / 2;
          const incomeH = (d.total_income / max) * chartH;
          const expenseH = (d.total_expense / max) * chartH;
          const baseY = padding.top + chartH;
          return (
            <g key={d.month}>
              <rect
                x={x - barW - 2}
                y={baseY - incomeH}
                width={barW}
                height={incomeH}
                rx={4}
                className="fill-brand-400"
              >
                <title>{`${THAI_MONTHS[d.month - 1]}: รายรับ ${d.total_income.toLocaleString("th-TH")} บาท`}</title>
              </rect>
              <rect
                x={x + 2}
                y={baseY - expenseH}
                width={barW}
                height={expenseH}
                rx={4}
                className="fill-accent-300"
              >
                <title>{`${THAI_MONTHS[d.month - 1]}: รายจ่าย ${d.total_expense.toLocaleString("th-TH")} บาท`}</title>
              </rect>
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="fill-gray-500 text-[10px]"
              >
                {THAI_MONTHS[d.month - 1].slice(0, 3)}
              </text>
            </g>
          );
        })}
        <line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={width - padding.right}
          y2={padding.top + chartH}
          className="stroke-gray-300"
        />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand-400" />{" "}
          รายรับ
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent-300" />{" "}
          รายจ่าย
        </span>
      </div>
    </div>
  );
}
