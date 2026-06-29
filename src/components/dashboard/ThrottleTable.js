"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function isActive(blockedUntil) {
  return new Date(blockedUntil) > new Date();
}

export default function ThrottleTable({ logs }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Throttle Events
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recent rate limit violations and IP blocks
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {logs.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/50">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <p className="text-sm text-muted-foreground">
                No throttle events yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Try the burst mode in API Tester
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[320px] overflow-auto rounded-lg border border-border/30">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">IP</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Endpoint</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Blocked Until</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, i) => (
                  <TableRow key={log._id || i} className="border-border/20">
                    <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.endpoint}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.city !== "Unknown"
                        ? `${log.city}, ${log.country}`
                        : log.country !== "Unknown"
                        ? log.country
                        : "Local"}
                    </TableCell>
                    <TableCell>
                      {isActive(log.blockedUntil) ? (
                        <Badge variant="destructive" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.blockedUntil)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
