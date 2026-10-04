import { cn } from "../../lib/cn.js";
import { statusOf } from "../../lib/statusMaps.js";

// Design §6.8. Never a button, never an icon. `animate` is for a change the viewer
// caused; a data refresh renders the new value with no transition.

const SIZES = {
  md: "h-[22px] px-[10px] text-caption",
  sm: "h-[18px] px-8 text-micro",
};

export function StatusChip({
  kind = "report",
  value,
  size = "md",
  animate = false,
  className,
}) {
  const status = statusOf(kind, value);
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border font-medium whitespace-nowrap",
        SIZES[size],
        status.tone,
        animate &&
          "transition-[background-color,border-color] duration-[200ms] ease-linear",
        className,
      )}
    >
      {status.label}
    </span>
  );
}
