import { NextResponse } from "next/server";
import { trackRequest, recordLatency } from "@/lib/tracking";

const MOCK_PRODUCTS = [
  { id: 1, name: "Quantum Keyboard", price: 149.99, category: "Electronics", stock: 234 },
  { id: 2, name: "Neural Display 4K", price: 899.99, category: "Electronics", stock: 56 },
  { id: 3, name: "Flux Capacitor", price: 1299.99, category: "Hardware", stock: 12 },
  { id: 4, name: "Dark Matter SSD 2TB", price: 249.99, category: "Storage", stock: 189 },
  { id: 5, name: "Photon Mouse", price: 79.99, category: "Peripherals", stock: 445 },
  { id: 6, name: "Gravity Headphones", price: 199.99, category: "Audio", stock: 167 },
  { id: 7, name: "Plasma Webcam", price: 129.99, category: "Peripherals", stock: 88 },
  { id: 8, name: "Nebula Router", price: 349.99, category: "Networking", stock: 73 },
];

export async function GET(request) {
  const start = performance.now();

  const blocked = await trackRequest(request, "/api/demo/products");
  if (blocked) return blocked;

  const res = NextResponse.json({
    data: MOCK_PRODUCTS,
    count: MOCK_PRODUCTS.length,
    endpoint: "/api/demo/products",
    timestamp: new Date().toISOString(),
  });

  const latency = performance.now() - start;
  await recordLatency("/api/demo/products", latency);

  return res;
}
