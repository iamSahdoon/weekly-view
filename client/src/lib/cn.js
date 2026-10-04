import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know the custom scales, or it treats `text-dense` (a size)
// and `text-ink` (a colour) as the same group and drops one of them.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "metric",
        "metric-sm",
        "page",
        "sub",
        "panel",
        "panel-sm",
        "lg",
        "base",
        "dense",
        "caption",
        "micro",
      ],
      spacing: [
        "0",
        "px",
        "2",
        "4",
        "6",
        "8",
        "11",
        "14",
        "16",
        "20",
        "22",
        "24",
        "26",
        "32",
        "44",
        "52",
        "62",
        "88",
        "96",
      ],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
