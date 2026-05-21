import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { fmtPLN, monthLabel } from "@/lib/api";

const FALLBACK_COLORS = [
  "#1E3A2F",
  "#E07A5F",
  "#F2CC8F",
  "#3E5743",
  "#B84A43",
  "#8B5A2B",
  "#2B4C3B",
  "#D06A4F",
  "#6E6B68",
];

export function CategoryPieCard({ breakdown, categories }) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const data = breakdown
    .map((b, i) => ({
      name: catMap[b.category_id]?.name || "Inne",
      value: b.amount,
      color: catMap[b.category_id]?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))
    .filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="balans-card h-full" data-testid="category-pie-card">
      <div className="mb-3">
        <h3 className="font-display text-lg tracking-tight">Wydatki wg kategorii</h3>
        <p className="text-xs text-[color:var(--balans-muted)]">
          Rozkład procentowy
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center">
          <p className="text-sm text-[color:var(--balans-muted)]">
            Brak wydatków do pokazania
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={92}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtPLN(v)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E5E0D8",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {data
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: d.color }}
                    />
                    <span>{d.name}</span>
                  </div>
                  <span className="tabular text-[color:var(--balans-muted)]">
                    {((d.value / total) * 100).toFixed(0)}% · {fmtPLN(d.value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrendCard({ trend }) {
  const data = trend.map((t) => ({
    name: monthLabel(t.month).split(" ")[0].slice(0, 3),
    Przychody: t.income,
    Wydatki: t.expenses,
  }));

  return (
    <div className="balans-card h-full" data-testid="trend-card">
      <div className="mb-3">
        <h3 className="font-display text-lg tracking-tight">Trend 6 miesięcy</h3>
        <p className="text-xs text-[color:var(--balans-muted)]">
          Przychody vs wydatki
        </p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid stroke="#E5E0D8" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#6E6B68"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6E6B68"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              formatter={(v) => fmtPLN(v)}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E5E0D8",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
            />
            <Bar dataKey="Przychody" fill="#E07A5F" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Wydatki" fill="#1E3A2F" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
