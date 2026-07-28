/** A device is considered online if it has heartbeat within this window (2x the expected 30s poll interval). */
const ONLINE_THRESHOLD_MS = 60_000;

export function isDeviceOnline(lastSeenAt: Date | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() < ONLINE_THRESHOLD_MS;
}
