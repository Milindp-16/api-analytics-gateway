"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import StatsCards from "@/components/dashboard/StatsCards";
import HitsChart from "@/components/dashboard/HitsChart";
import TimelineChart from "@/components/dashboard/TimelineChart";
import ThrottleTable from "@/components/dashboard/ThrottleTable";
import ApiTester from "@/components/dashboard/ApiTester";
import DeveloperSettings from "@/components/dashboard/DeveloperSettings";

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
      setGeoData(geoRes.geoData || []);
      setUniqueCountries(geoRes.uniqueCountries || 0);
      setThrottleLogs(throttleRes.logs || []);
      setBlockedIPs(throttleRes.uniqueBlockedIPs || 0);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const handleRequestComplete = () => {
    // Refresh data after API tester fires requests (slight delay for processing)
    setTimeout(fetchAllData, 500);
  };

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
          <DeveloperSettings onKeyUpdate={setApiKey} />
        </div>

        <div className="mb-6">
          <StatsCards
            totalHits={totalHits}
            endpointCount={hitsData.length || 3}
            blockedIPs={blockedIPs}
            countries={uniqueCountries}
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
          <ApiTester onRequestComplete={handleRequestComplete} apiKey={apiKey} />
        </div>
      </main>
    </div>
  );
}
