/**
 * Server-side Socket.io event emitter.
 * Reads globalThis.__io (set by server.mjs) and emits events.
 * Fails silently if io is not available (e.g., during build).
 */

function getIO() {
  return globalThis.__io || null;
}

/**
 * Emit when an API endpoint receives a successful hit.
 * @param {string} endpoint - e.g. "/api/demo/users"
 * @param {number} newCount - updated total hit count for this endpoint
 */
export function emitHit(endpoint, newCount) {
  const io = getIO();
  if (!io) return;

  io.emit("api:hit", {
    endpoint,
    name: endpoint.split("/").pop(),
    count: newCount,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit when a client gets rate-limited / blocked.
 * @param {object} throttleEntry - the parsed throttle log entry
 */
export function emitThrottle(throttleEntry) {
  const io = getIO();
  if (!io) return;

  io.emit("api:throttle", throttleEntry);
}

/**
 * Emit when a geo-located hit is recorded.
 * @param {object} geoEntry - { ip, endpoint, lat, lng, city, country, timestamp }
 */
export function emitGeo(geoEntry) {
  const io = getIO();
  if (!io) return;

  io.emit("api:geo", geoEntry);
}
