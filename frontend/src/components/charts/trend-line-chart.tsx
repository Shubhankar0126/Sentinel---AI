"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TrendLineChartProps {
  data: Array<{ label: string; value: number }>;
  stroke?: string;
}

export function TrendLineChart({ data, stroke = "#06b6d4" }: TrendLineChartProps) {
  return (
    <div
      className="h-64 w-full sm:h-72"
      role="img"
      aria-label="Trend line chart showing score changes over time"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
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
            cursor={{ stroke: "rgba(6, 182, 212, 0.28)", strokeWidth: 1 }}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            itemStyle={{ color: "#cbd5e1", paddingTop: 4, paddingBottom: 0 }}
            contentStyle={{
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid rgba(71, 85, 105, 0.95)",
              borderRadius: "1rem",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.26)"
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={3}
            dot={{ fill: stroke, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: stroke }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
