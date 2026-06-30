"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

// Helper to calculate percentiles
function getPercentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

export default function LatencyMetrics({ data }) {
  const endpoints = Object.keys(data);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Server-Side Latency (ms)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          P50, P95, and P99 percentiles for the last 1000 requests.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/20 border-b border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-lg">Endpoint</th>
                <th className="px-4 py-3 font-medium">P50 (Median)</th>
                <th className="px-4 py-3 font-medium text-amber-500">P95 (Slow)</th>
                <th className="px-4 py-3 font-medium text-red-500 rounded-tr-lg">P99 (Worst 1%)</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">
                    No latency data available.
                  </td>
                </tr>
              ) : (
                endpoints.map((ep) => {
                  const arr = data[ep] || [];
                  const p50 = getPercentile(arr, 50);
                  const p95 = getPercentile(arr, 95);
                  const p99 = getPercentile(arr, 99);
                  const name = ep.replace("/api/demo/", "/");

                  return (
                    <tr key={ep} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono">{name}</td>
                      <td className="px-4 py-3">{p50}ms</td>
                      <td className="px-4 py-3 font-medium text-amber-500">{p95}ms</td>
                      <td className="px-4 py-3 font-bold text-red-500">{p99}ms</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
