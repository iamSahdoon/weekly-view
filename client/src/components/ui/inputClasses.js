import { cn } from "../../lib/cn.js";

// The Input look (design §6.2), shared by Input, Textarea and Select, whose
// states mirror it. A module of its own so the component files export components only.
export const inputClasses = cn(
  "focus-halo block w-full min-w-0 border border-hair bg-tint px-[12px] font-ui text-base text-ink",
  "placeholder:text-mut max-md:text-lg",
  "transition-[background-color,border-color] duration-[120ms] ease-linear",
  "enabled:hover:border-hair2 focus:border-acc focus:bg-card",
  "disabled:cursor-not-allowed disabled:bg-tint2 disabled:text-mut",
  "read-only:border-dashed read-only:bg-transparent read-only:text-body read-only:hover:border-hair",
  "aria-invalid:border-st-corr-fg",
);
