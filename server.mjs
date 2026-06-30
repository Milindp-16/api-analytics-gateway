import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new SocketIOServer(httpServer, {
    // Allow connections from the same origin (no CORS needed for same-port)
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    // Use WebSocket transport first, fall back to polling
    transports: ["websocket", "polling"],
  });

  // Store io globally so API route handlers can emit events
  globalThis.__io = io;

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║  🚀  API Analytics Gateway                       ║
║  ─────────────────────────────────────────────    ║
║  Local:       http://${hostname}:${port}              ║
║  Socket.io:   ws://${hostname}:${port} (same port)     ║
║  Mode:        ${dev ? "development" : "production"}                        ║
╚═══════════════════════════════════════════════════╝
    `);
  });
});
