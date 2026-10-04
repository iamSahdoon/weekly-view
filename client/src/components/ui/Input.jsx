import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { inputClasses } from "./inputClasses.js";

// Design §6.2. 38px (44px below 768px, or size="lg" — the auth screens' 44px).

const HEIGHTS = {
  md: "h-[var(--ctrl-h)] max-md:h-[var(--ctrl-h-lg)]",
  lg: "h-[var(--ctrl-h-lg)]",
};

export const Input = forwardRef(function Input(
  { size = "md", prefix, suffix, type = "text", className, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      type={type}
      className={cn(
        inputClasses,
        HEIGHTS[size],
        type === "number" && "text-right tabular-nums",
        (prefix || suffix) && "border-0 focus:bg-transparent",
        !(prefix || suffix) && className,
      )}
      {...props}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div
      className={cn(
        "flex items-stretch border border-hair bg-tint has-[input:focus]:border-acc has-[input:focus]:bg-card",
        "has-[input[aria-invalid=true]]:border-st-corr-fg",
        className,
      )}
    >
      {prefix && <Affix side="prefix">{prefix}</Affix>}
      {input}
      {suffix && <Affix side="suffix">{suffix}</Affix>}
    </div>
  );
});

function Affix({ side, children }) {
  return (
    <span
      className={cn(
        "flex items-center border-hair px-11 font-mono text-caption text-mut",
        side === "prefix" ? "border-r" : "border-l",
      )}
    >
      {children}
    </span>
  );
}
