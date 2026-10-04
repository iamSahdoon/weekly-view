import { cn } from "../../lib/cn.js";
import { initialsOf } from "../../lib/format.js";

// Design §6.18: square, initials in Chivo 700 at 45% of the height. No photos,
// no status dot.

const SIZES = {
  22: "size-[22px] text-[10px]",
  28: "size-[28px] text-[12.6px]",
  32: "size-[32px] text-[14.4px]",
  44: "size-[44px] text-[19.8px]",
};

export function Avatar({ name, size = 28, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-hair bg-tint2 font-display leading-none font-bold tracking-[.02em] text-body",
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
