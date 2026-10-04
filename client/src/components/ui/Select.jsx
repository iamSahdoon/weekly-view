import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { inputClasses } from "./inputClasses.js";

// Design §6.4: native on purpose — accessible, keyboard-correct, the OS picker on
// mobile. `options` is [{ value, label, disabled? }]; `placeholder` is a disabled
// first option shown in --mut while it is the selection.

export const Select = forwardRef(function Select(
  { options = [], placeholder, size = "md", className, children, ...props },
  ref,
) {
  return (
    <div className={cn("relative", className)}>
      <select
        ref={ref}
        className={cn(
          inputClasses,
          "appearance-none pr-32",
          size === "lg"
            ? "h-[var(--ctrl-h-lg)]"
            : "h-[var(--ctrl-h)] max-md:h-[var(--ctrl-h-lg)]",
          "has-[option[value='']:checked]:text-mut",
        )}
        {...props}
      >
        {placeholder != null && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-[12px] size-[10px] -translate-y-1/2 text-mut"
        strokeWidth={2.5}
      />
    </div>
  );
});
