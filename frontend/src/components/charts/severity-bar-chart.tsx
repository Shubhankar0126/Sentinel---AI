"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface SeverityBarChartProps {
  data: Array<{ label: string; value: number }>;
  onSelect?: (label: string) => void;
}

export function SeverityBarChart({ data, onSelect }: SeverityBarChartProps) {
  return (
    <div
      className="h-64 w-full sm:h-72"
      role="img"
      aria-label="Bar chart showing severity distribution"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
          <XAxis
            dataKey="label"
            stroke="rgba(148, 163, 184, 0.78)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke="rgba(148, 163, 184, 0.78)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip
            cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            itemStyle={{ color: "#cbd5e1", paddingTop: 4, paddingBottom: 0 }}
            contentStyle={{
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid rgba(71, 85, 105, 0.95)",
              borderRadius: "1rem",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.26)"
            }}
          />
          <Bar
            dataKey="value"
            radius={[10, 10, 0, 0]}
            fill="rgba(37, 99, 235, 0.92)"
            className={onSelect ? "cursor-pointer" : undefined}
            onClick={(payload) => {
              if (onSelect && payload?.label) {
                onSelect(String(payload.label));
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
