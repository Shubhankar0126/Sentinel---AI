"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#94a3b8"];

interface StatusDonutChartProps {
  data: Array<{ label: string; value: number }>;
  onSelect?: (label: string) => void;
}

export function StatusDonutChart({ data, onSelect }: StatusDonutChartProps) {
  return (
    <div
      className="h-64 w-full sm:h-72"
      role="img"
      aria-label="Donut chart showing status distribution"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={66}
            outerRadius={100}
            paddingAngle={2}
            onClick={(payload) => {
              if (onSelect && payload?.label) {
                onSelect(String(payload.label));
              }
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`${entry.label}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            itemStyle={{ color: "#cbd5e1", paddingTop: 4, paddingBottom: 0 }}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            contentStyle={{
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid rgba(71, 85, 105, 0.95)",
              borderRadius: "1rem",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.26)"
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
