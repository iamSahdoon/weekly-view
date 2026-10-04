import { useOnlineStatus } from "../../hooks/useOnlineStatus.js";

// Design §3.13: a --tint2 strip below the top bar. The edit survives in memory;
// nothing is written to the device and nothing syncs.

export function OfflineStrip() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <p
      role="status"
      className="border-b border-hair bg-tint2 px-32 py-8 text-dense text-body max-md:px-20"
    >
      You&rsquo;re offline. Unsaved changes are kept until you reconnect.
    </p>
  );
}
