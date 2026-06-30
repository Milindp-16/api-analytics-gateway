"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ENDPOINTS = [
  { path: "/api/demo/users", label: "Users", color: "oklch(0.7 0.18 250)" },
  { path: "/api/demo/products", label: "Products", color: "oklch(0.75 0.15 160)" },
  { path: "/api/demo/orders", label: "Orders", color: "oklch(0.65 0.2 30)" },
];

// Simulated IPs from various countries for demo geo data
const SIMULATED_IPS = [
  "8.8.8.8",         // US (Google)
  "1.1.1.1",         // AU (Cloudflare)
  "208.67.222.222",  // US (OpenDNS)
  "9.9.9.9",         // US (Quad9)
  "185.228.168.9",   // DE (CleanBrowsing)
  "77.88.8.8",       // RU (Yandex)
  "101.101.101.101", // TW
  "223.5.5.5",       // CN (Alibaba)
  "156.154.70.1",    // US (Neustar)
  "114.114.114.114", // CN
  "94.140.14.14",    // CY (AdGuard)
  "76.76.19.19",     // US (Alternate DNS)
];


export default function ApiTester({ onRequestComplete, apiKey, plan = "free" }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState({});
  const [burstRunning, setBurstRunning] = useState(false);
  const [burstProgress, setBurstProgress] = useState(0);

  const isPro = plan === "pro";

  const hitEndpoint = useCallback(
    async (path, simulateIp = null) => {
      const headers = {};
      if (simulateIp) {
        headers["x-simulated-ip"] = simulateIp;
      }
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const start = performance.now();
      try {
        const res = await fetch(path, { headers });
        const elapsed = Math.round(performance.now() - start);
        const data = await res.json();

        const result = {
          id: Date.now() + Math.random(),
          path,
          status: res.status,
          time: elapsed,
          ip: simulateIp || "local",
          timestamp: new Date().toLocaleTimeString(),
        };

        setResults((prev) => [result, ...prev].slice(0, 20));
        return result;
      } catch (err) {
        const result = {
          id: Date.now() + Math.random(),
          path,
          status: "ERR",
          time: 0,
          ip: simulateIp || "local",
          timestamp: new Date().toLocaleTimeString(),
        };
        setResults((prev) => [result, ...prev].slice(0, 20));
        return result;
      }
    },
    [apiKey]
  );

  const handleSingleHit = async (path) => {
    setLoading((prev) => ({ ...prev, [path]: true }));
    // Pick a random simulated IP for variety
    const ip = SIMULATED_IPS[Math.floor(Math.random() * SIMULATED_IPS.length)];
    await hitEndpoint(path, ip);
    setLoading((prev) => ({ ...prev, [path]: false }));
    onRequestComplete?.();
  };

  const handleBurst = async () => {
    setBurstRunning(true);
    setBurstProgress(0);

    // Pick a random IP to act as the "malicious" attacker for this burst session
    const maliciousIp = SIMULATED_IPS[Math.floor(Math.random() * SIMULATED_IPS.length)];

    const total = 55; // Enough to trigger rate limit on free (50 threshold), safe on pro (1000 threshold)
    for (let i = 0; i < total; i++) {
      const ep = ENDPOINTS[i % ENDPOINTS.length];
      await hitEndpoint(ep.path, maliciousIp);
      setBurstProgress(i + 1);
    }

    setBurstRunning(false);
    onRequestComplete?.();
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">API Tester</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fire requests to generate analytics data
            </p>
          </div>
          <Badge
            variant={isPro ? "default" : "secondary"}
            className={
              isPro
                ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-amber-500/30"
                : ""
            }
          >
            {isPro ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 mr-1">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                PRO
              </>
            ) : "FREE"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Endpoint buttons */}
        <div className="flex flex-wrap gap-2">
          {ENDPOINTS.map((ep) => (
            <Button
              key={ep.path}
              variant="outline"
              size="sm"
              onClick={() => handleSingleHit(ep.path)}
              disabled={loading[ep.path] || burstRunning}
              className="gap-2 border-border/50 transition-all hover:border-border"
            >
              {loading[ep.path] ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: ep.color }}
                />
              )}
              Hit /{ep.label.toLowerCase()}
            </Button>
          ))}
        </div>

        {/* Burst button — behavior hint changes based on plan */}
        <div className="flex items-center gap-3">
          <Button
            variant={isPro ? "outline" : "destructive"}
            size="sm"
            onClick={handleBurst}
            disabled={burstRunning}
            className={`gap-2 ${isPro ? "border-amber-500/40 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/60" : ""}`}
          >
            {burstRunning ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Bursting… {burstProgress}/55
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                </svg>
                {isPro
                  ? "Burst 55 reqs (within Pro limit ✓)"
                  : "Burst 55 reqs (exceeds Free limit ⛔)"}
              </>
            )}
          </Button>
          {burstRunning && (
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${isPro ? "bg-amber-500" : "bg-destructive"}`}
                  style={{ width: `${(burstProgress / 55) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Plan-specific hint */}
        <p className="text-xs text-muted-foreground/70">
          {isPro
            ? "Pro plan: 1,000 reqs/min — burst of 55 will NOT trigger rate limiting."
            : "Free plan: 50 reqs/min — burst of 55 will exceed the limit and block your API key."}
        </p>

        {/* Results log */}
        {results.length > 0 && (
          <div className="max-h-[200px] overflow-auto rounded-lg border border-border/30 bg-background/50">
            <div className="space-y-px p-1">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-xs font-mono"
                >
                  <span className="text-muted-foreground w-16 shrink-0">
                    {r.timestamp}
                  </span>
                  <Badge
                    variant={
                      r.status === 200
                        ? "default"
                        : r.status === 429
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-[10px] px-1.5 py-0 h-4 font-mono"
                  >
                    {r.status}
                  </Badge>
                  <span className="text-muted-foreground truncate flex-1">
                    {r.path}
                  </span>
                  <span className="text-muted-foreground/70 shrink-0">
                    {r.ip}
                  </span>
                  <span className="text-muted-foreground/70 shrink-0 w-12 text-right">
                    {r.time}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
