"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import StatsCards from "@/components/dashboard/StatsCards";
import HitsChart from "@/components/dashboard/HitsChart";
import TimelineChart from "@/components/dashboard/TimelineChart";
import ThrottleTable from "@/components/dashboard/ThrottleTable";
import ApiTester from "@/components/dashboard/ApiTester";
import DeveloperSettings from "@/components/dashboard/DeveloperSettings";
import { useSocket } from "@/hooks/useSocket";

// Dynamically import GeoHeatmap to avoid SSR issues with Leaflet
const GeoHeatmap = dynamic(
  () => import("@/components/dashboard/GeoHeatmap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[440px] items-center justify-center rounded-lg border border-border/50 bg-card/50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const [hitsData, setHitsData] = useState([]);
  const [totalHits, setTotalHits] = useState(0);
  const [timelineData, setTimelineData] = useState([]);
  const [geoData, setGeoData] = useState([]);
  const [throttleLogs, setThrottleLogs] = useState([]);
  const [uniqueCountries, setUniqueCountries] = useState(0);
  const [blockedIPs, setBlockedIPs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState(null);
  const [plan, setPlan] = useState("free");

  const { socket, connected } = useSocket();
  // Track known countries in a ref to avoid re-renders for set operations
  const countriesRef = useRef(new Set());

  // One-time initial data fetch via REST
  const fetchAllData = useCallback(async () => {
    try {
      const [hitsRes, timelineRes, geoRes, throttleRes] = await Promise.all([
        fetch("/api/analytics/hits").then((r) => r.json()),
        fetch("/api/analytics/timeline").then((r) => r.json()),
        fetch("/api/analytics/geo").then((r) => r.json()),
        fetch("/api/analytics/throttle-logs").then((r) => r.json()),
      ]);

      setHitsData(hitsRes.hits || []);
      setTotalHits(hitsRes.totalHits || 0);
      setTimelineData(timelineRes.timeline || []);

      const geoItems = geoRes.geoData || [];
      setGeoData(geoItems);
      setUniqueCountries(geoRes.uniqueCountries || 0);
      // Populate the countries ref from initial data
      geoItems.forEach((g) => countriesRef.current.add(g.country));

      setThrottleLogs(throttleRes.logs || []);
      setBlockedIPs(throttleRes.uniqueBlockedIPs || 0);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial data once on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time Socket.io event listeners
  useEffect(() => {
    if (!socket) return;

    // ─── api:hit ───
    // Incrementally update the hit count for the endpoint that was just hit
    const onHit = (data) => {
      // data: { endpoint, name, count, timestamp }
      setHitsData((prev) => {
        const updated = prev.map((item) =>
          item.endpoint === data.endpoint
            ? { ...item, count: data.count }
            : item
        );
        // If endpoint doesn't exist in the array yet, add it
        if (!updated.find((item) => item.endpoint === data.endpoint)) {
          updated.push({
            endpoint: data.endpoint,
            name: data.name,
            count: data.count,
          });
        }
        return updated;
      });
      setTotalHits((prev) => prev + 1);
    };

    // ─── api:throttle ───
    // Prepend the new throttle entry to the logs
    const onThrottle = (data) => {
      // data: { ip, endpoint, reason, blockedUntil, city, country, timestamp }
      setThrottleLogs((prev) => [data, ...prev].slice(0, 100));
      setBlockedIPs((prev) => prev + 1);
    };

    // ─── api:geo ───
    // Merge the new geo point into the aggregated geo data
    const onGeo = (data) => {
      // data: { ip, endpoint, lat, lng, city, country, timestamp }
      setGeoData((prev) => {
        const key = `${data.lat}:${data.lng}`;
        const existing = prev.find(
          (g) => `${g.lat}:${g.lng}` === key
        );
        if (existing) {
          return prev.map((g) =>
            `${g.lat}:${g.lng}` === key
              ? { ...g, count: (g.count || 1) + 1, lastHit: data.timestamp }
              : g
          );
        }
        return [
          ...prev,
          {
            lat: data.lat,
            lng: data.lng,
            city: data.city,
            country: data.country,
            count: 1,
            lastHit: data.timestamp,
          },
        ];
      });

      // Update unique countries
      if (data.country && !countriesRef.current.has(data.country)) {
        countriesRef.current.add(data.country);
        setUniqueCountries(countriesRef.current.size);
      }
    };

    socket.on("api:hit", onHit);
    socket.on("api:throttle", onThrottle);
    socket.on("api:geo", onGeo);

    return () => {
      socket.off("api:hit", onHit);
      socket.off("api:throttle", onThrottle);
      socket.off("api:geo", onGeo);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Real-time API traffic monitoring and analytics
          </p>
        </div>

        <div className="mb-6">
          <DeveloperSettings onKeyUpdate={setApiKey} onPlanUpdate={setPlan} />
        </div>

        <div className="mb-6">
          <StatsCards
            totalHits={totalHits}
            endpointCount={hitsData.length || 3}
            blockedIPs={blockedIPs}
            countries={uniqueCountries}
            connected={connected}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <HitsChart data={hitsData} />
          <TimelineChart data={timelineData} />
        </div>

        <div className="mb-6">
          <GeoHeatmap data={geoData} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ThrottleTable logs={throttleLogs} />
          <ApiTester apiKey={apiKey} plan={plan} />
        </div>
      </main>
    </div>
  );
}
