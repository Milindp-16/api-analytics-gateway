"use client";

import { Card, CardContent } from "@/components/ui/card";

const icons = {
  hits: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  ),
  endpoints: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
    </svg>
  ),
  blocked: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  countries: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
};

const colorClasses = [
  "text-[oklch(0.7_0.18_250)] bg-[oklch(0.7_0.18_250/0.1)]",
  "text-[oklch(0.75_0.15_160)] bg-[oklch(0.75_0.15_160/0.1)]",
  "text-[oklch(0.65_0.2_30)] bg-[oklch(0.65_0.2_30/0.1)]",
  "text-[oklch(0.8_0.15_85)] bg-[oklch(0.8_0.15_85/0.1)]",
];

export default function StatsCards({ totalHits, endpointCount, blockedIPs, countries }) {
  const stats = [
    { label: "Total Hits", value: totalHits.toLocaleString(), icon: "hits", change: null },
    { label: "Active Endpoints", value: endpointCount, icon: "endpoints", change: null },
    { label: "Blocked IPs", value: blockedIPs, icon: "blocked", change: null },
    { label: "Countries", value: countries, icon: "countries", change: null },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card
          key={stat.label}
          className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {stat.value}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClasses[i]} transition-transform duration-300 group-hover:scale-110`}
              >
                {icons[stat.icon]}
              </div>
            </div>
          </CardContent>
          {/* Subtle gradient border on hover */}
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Card>
      ))}
    </div>
  );
}
