import * as RadixSwitch from "@radix-ui/react-switch";
import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn.js";

// "I'm on leave", "Open to team comments" (frontend_architecture.md §8.1). The
// design system gives no anatomy; this follows the Checkbox: square, hairline,
// --acc when on, opacity and position only.

export const Switch = forwardRef(function Switch(
  { label, id: idProp, className, ...props },
  ref,
) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <span
      className={cn("inline-flex min-h-[24px] items-center gap-8", className)}
    >
      <RadixSwitch.Root
        ref={ref}
        id={id}
        className={cn(
          "focus-halo relative inline-flex h-[18px] w-[32px] shrink-0 items-center border border-rule bg-tint2",
          "transition-[background-color,border-color] duration-[120ms] ease-linear",
          "enabled:hover:border-hair2 data-[state=checked]:border-acc data-[state=checked]:bg-acc",
          "disabled:cursor-not-allowed disabled:border-hair disabled:bg-tint2",
        )}
        {...props}
      >
        <RadixSwitch.Thumb
          className={cn(
            "block size-[12px] translate-x-[2px] bg-card shadow-none",
            "transition-transform duration-[120ms] ease-[var(--ease-out)]",
            "data-[state=checked]:translate-x-[16px] data-[state=checked]:bg-on-acc",
            "data-disabled:bg-hair2",
          )}
        />
      </RadixSwitch.Root>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-dense text-body",
            props.disabled ? "cursor-not-allowed text-mut" : "cursor-pointer",
          )}
        >
          {label}
        </label>
      )}
    </span>
  );
});
