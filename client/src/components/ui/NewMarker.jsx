import { cn } from "../../lib/cn.js";

// Design §6.24: the product's only notification device. A 6×6 --acc square, zero
// radius, placed on the thing that is new. No number, no toast, no bell. The word
// is the accessible text; opening the week clears it.

export function NewMarker({ className }) {
  return (
    <span
      className={cn("inline-block size-[6px] shrink-0 bg-acc", className)}
      role="img"
      aria-label="New"
    />
  );
}
