"use client";

import { useEffect, useRef, useState } from "react";
import { io as ioClient } from "socket.io-client";

/**
 * Custom hook that creates a singleton Socket.io connection.
 * Returns { socket, connected }.
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to the same host (custom server serves both HTTP and WS)
    const socket = ioClient({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.io] Connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.io] Disconnected");
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket.io] Connection error:", err.message);
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { socket: socketRef.current, connected };
}
