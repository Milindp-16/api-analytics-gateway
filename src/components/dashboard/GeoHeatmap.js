"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GeoHeatmap({ data }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Dynamic import for SSR safety
    let cancelled = false;

    async function initMap() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // leaflet.heat adds L.heatLayer
      await import("leaflet.heat");

      if (cancelled || !mapRef.current) return;

      // Only create map once
      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [25, 0],
          zoom: 2,
          minZoom: 2,
          maxZoom: 12,
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: true,
        });

        // Dark themed tiles
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            subdomains: "abcd",
            maxZoom: 19,
          }
        ).addTo(map);

        mapInstanceRef.current = map;
      }

      setLoaded(true);
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, []);

  // Update heatmap data when data changes
  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;

    const L = require("leaflet");

    // Remove old heat layer
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
    }

    if (data && data.length > 0) {
      const heatData = data.map((point) => [
        point.lat,
        point.lng,
        point.count * 3, // Much higher intensity for visibility
      ]);

      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 35, // Larger dots
        blur: 25,
        maxZoom: 10,
        max: Math.max(...data.map((d) => d.count)) || 1,
        gradient: {
          0.0: "rgba(0, 255, 255, 0.5)", // Cyan glow
          0.3: "rgba(0, 255, 0, 0.8)",   // Bright green
          0.6: "rgba(255, 255, 0, 0.9)", // Yellow
          0.8: "rgba(255, 165, 0, 1)",   // Orange
          1.0: "rgba(255, 0, 0, 1)",     // Pure red
        },
      }).addTo(mapInstanceRef.current);
    }
  }, [data, loaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Global Traffic Map
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Geographic distribution of API request origins
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative overflow-hidden rounded-lg border border-border/30">
          <div ref={mapRef} className="h-[380px] w-full" />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading map…</p>
              </div>
            </div>
          )}
          {loaded && (!data || data.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none">
              <div className="rounded-lg bg-card/90 backdrop-blur-sm px-4 py-3 text-center border border-border/30">
                <p className="text-sm text-muted-foreground">
                  No geo data yet — hit some APIs with simulated IPs!
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
