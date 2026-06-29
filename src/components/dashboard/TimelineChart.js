"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-xl">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-sm">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold text-foreground">
              {p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function CustomLegend({ payload }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-4">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function TimelineChart({ data }) {
  const chartData = data.map((item) => ({
    ...item,
    label: item.hour ? item.hour.slice(11) : "",
  }));

  // Dynamically build the series from data keys
  let dynamicSeries = [];
  if (data && data.length > 0) {
    const excludedKeys = ["hour", "label"];
    const keys = Object.keys(data[0]).filter((k) => !excludedKeys.includes(k));
    
    const colors = [
      "oklch(0.7 0.18 250)",
      "oklch(0.75 0.15 160)",
      "oklch(0.65 0.2 30)",
      "oklch(0.6 0.15 300)",
      "oklch(0.8 0.15 100)",
    ];

    dynamicSeries = keys.map((key, i) => ({
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      color: colors[i % colors.length],
    }));
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Traffic Over Time
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          5-minute request volume per endpoint
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px] w-full">
          {dynamicSeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  {dynamicSeries.map((s) => (
                    <linearGradient
                      key={s.key}
                      id={`gradient-${s.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.3 0 0 / 30%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "oklch(0.65 0 0)", fontSize: 11 }}
                  axisLine={{ stroke: "oklch(0.3 0 0 / 30%)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "oklch(0.65 0 0)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
                {dynamicSeries.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={`url(#gradient-${s.key})`}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
