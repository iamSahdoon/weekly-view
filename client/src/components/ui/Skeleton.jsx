import { cn } from "../../lib/cn.js";

// Design §6.16: --tint, the exact height of what it replaces, one opacity pulse.
// No shimmer sweep. The caller sets the size, so arriving content doesn't reflow.

export function Skeleton({ className, style }) {
  return (
    <div
      aria-hidden="true"
      className={cn("wv-skeleton bg-tint", className)}
      style={style}
    />
  );
}
