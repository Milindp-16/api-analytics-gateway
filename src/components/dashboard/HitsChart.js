"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "oklch(0.7 0.18 250)",   // Blue
  "oklch(0.75 0.15 160)",  // Teal
  "oklch(0.65 0.2 30)",    // Orange
];

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-xl">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {payload[0].value.toLocaleString()}
          </span>{" "}
          hits
        </p>
      </div>
    );
  }
  return null;
}

export default function HitsChart({ data }) {
  const chartData = data.map((item) => ({
    name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
    hits: item.count,
    endpoint: item.endpoint,
  }));

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Hits by Endpoint
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total requests per API endpoint
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.3 0 0 / 30%)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.3 0 0 / 30%)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(1 0 0 / 5%)" }} />
              <Bar dataKey="hits" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
