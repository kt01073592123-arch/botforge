"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Row = {
  day: string;
  conversations: number;
  leads: number;
  messages: number;
};

export default function AnalyticsChart({ data }: { data: Row[] }) {
  const formatted = data.map((d) => ({
    ...d,
    short: new Date(d.day).toLocaleDateString("uz", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer>
        <AreaChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-conv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-lead" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#19c37d" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#19c37d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1c2230" strokeDasharray="3 3" />
          <XAxis
            dataKey="short"
            stroke="#7d8696"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke="#7d8696" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#11141b",
              border: "1px solid #1c2230",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e6ecf2" }}
          />
          <Area
            type="monotone"
            dataKey="conversations"
            stroke="#7c5cff"
            fill="url(#grad-conv)"
            strokeWidth={2}
            name="Suhbat"
          />
          <Area
            type="monotone"
            dataKey="leads"
            stroke="#19c37d"
            fill="url(#grad-lead)"
            strokeWidth={2}
            name="Lead"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
