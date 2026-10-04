import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { InlineError } from "../ui/InlineError.jsx";
import { BrandMark } from "./BrandMark.jsx";

// Boot (frontend_architecture.md §3.5, FA13 default): the glyph alone; after 3 s
// of pending, one --mut line. After boot's retries run out, the error panel.

export function AppBootSplash() {
  const { bootFailed, retryBoot } = useAuth();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-20 bg-paper px-16"
    >
      <BrandMark wordmark={false} glyphSize={32} />
      {bootFailed ? (
        <InlineError
          className="w-full max-w-[420px]"
          title="Couldn't reach the server."
          onRetry={retryBoot}
        >
          WeeklyView didn't answer after a minute. Your session is kept; try
          again in a moment.
        </InlineError>
      ) : (
        slow && (
          <p className="max-w-[420px] text-center text-base text-mut">
            Starting up. The server sleeps when idle; this can take up to a
            minute.
          </p>
        )
      )}
    </div>
  );
}
