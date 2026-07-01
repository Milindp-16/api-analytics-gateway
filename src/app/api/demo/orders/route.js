import { NextResponse } from "next/server";
import { trackRequest, recordLatency } from "@/lib/tracking";

const MOCK_ORDERS = [
  { id: "ORD-001", customer: "Alice Johnson", total: 249.98, status: "delivered", items: 2 },
  { id: "ORD-002", customer: "Bob Smith", total: 899.99, status: "shipped", items: 1 },
  { id: "ORD-003", customer: "Charlie Brown", total: 79.99, status: "processing", items: 1 },
  { id: "ORD-004", customer: "Diana Prince", total: 1549.98, status: "delivered", items: 3 },
  { id: "ORD-005", customer: "Eve Wilson", total: 449.98, status: "shipped", items: 2 },
  { id: "ORD-006", customer: "Frank Castle", total: 129.99, status: "cancelled", items: 1 },
  { id: "ORD-007", customer: "Grace Hopper", total: 2199.97, status: "delivered", items: 4 },
  { id: "ORD-008", customer: "Henry Ford", total: 349.99, status: "processing", items: 1 },
];

export async function GET(request) {
  const start = performance.now();

  //the incoming request gets intercepted here(acts as mini-middleware)
  //if we are allowed blocked = null else if api-key is bad or rate limit exceed then blocked = json obj
  const blocked = await trackRequest(request, "/api/demo/orders");
  if (blocked) return blocked;

  //the data inside it is not valuable, it only matters that the request is not blocked
  const res = NextResponse.json({
    data: MOCK_ORDERS,
    count: MOCK_ORDERS.length,
    endpoint: "/api/demo/orders",
    timestamp: new Date().toISOString(),
  });

  const latency = performance.now() - start;
  await recordLatency("/api/demo/orders", latency);

  return res;
}
