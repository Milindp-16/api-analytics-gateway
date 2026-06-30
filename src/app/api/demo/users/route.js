import { NextResponse } from "next/server";
import { trackRequest, recordLatency } from "@/lib/tracking";

const MOCK_USERS = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "active" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Editor", status: "active" },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "Viewer", status: "inactive" },
  { id: 4, name: "Diana Prince", email: "diana@example.com", role: "Admin", status: "active" },
  { id: 5, name: "Eve Wilson", email: "eve@example.com", role: "Editor", status: "active" },
  { id: 6, name: "Frank Castle", email: "frank@example.com", role: "Viewer", status: "active" },
  { id: 7, name: "Grace Hopper", email: "grace@example.com", role: "Admin", status: "active" },
  { id: 8, name: "Henry Ford", email: "henry@example.com", role: "Editor", status: "inactive" },
];

export async function GET(request) {
  const start = performance.now();

  const blocked = await trackRequest(request, "/api/demo/users");
  if (blocked) return blocked;

  const res = NextResponse.json({
    data: MOCK_USERS,
    count: MOCK_USERS.length,
    endpoint: "/api/demo/users",
    timestamp: new Date().toISOString(),
  });

  const latency = performance.now() - start;
  await recordLatency("/api/demo/users", latency);

  return res;
}
