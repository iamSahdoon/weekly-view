import { Slot } from "@radix-ui/react-slot";
import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

// Design §6.1. Labels are sentence case, verb-first, never with an arrow.

const SIZES = {
  sm: "h-[var(--ctrl-h-sm)] px-11 text-dense [&_svg]:size-[14px]",
  md: "h-[var(--ctrl-h)] px-16 text-base [&_svg]:size-[16px]",
  lg: "h-[var(--ctrl-h-lg)] px-22 text-[15px] [&_svg]:size-[16px]",
};

const ICON_SIZES = {
  sm: "w-[var(--ctrl-h-sm)]",
  md: "w-[var(--ctrl-h)]",
  lg: "w-[var(--ctrl-h-lg)]",
};

const VARIANTS = {
  primary:
    "border-acc bg-acc text-on-acc enabled:hover:border-acc-d enabled:hover:bg-acc-d enabled:active:scale-[.985] " +
    "disabled:border-tint2 disabled:bg-tint2 disabled:text-mut",
  secondary:
    "border-rule bg-card text-ink enabled:hover:border-hair2 enabled:hover:bg-tint enabled:active:bg-tint2 " +
    "disabled:border-hair disabled:text-mut",
  ghost:
    "border-transparent bg-transparent text-body enabled:hover:bg-tint enabled:hover:text-ink enabled:active:bg-tint2 " +
    "disabled:text-mut",
  destructive:
    "border-st-corr-bd bg-card text-st-corr-fg enabled:hover:bg-st-corr-bg enabled:active:border-st-corr-fg enabled:active:bg-st-corr-bg " +
    "disabled:border-hair disabled:text-mut",
  // On an --ink surface only. --on-acc is white in both themes.
  inverted:
    "border-paper bg-paper text-ink enabled:hover:border-on-acc enabled:hover:bg-on-acc enabled:active:scale-[.985] " +
    "disabled:border-d-panel2 disabled:bg-d-panel2 disabled:text-d-mut",
};

const SPINNER_TONES = {
  primary: "text-on-acc",
  secondary: "text-ink",
  ghost: "text-mut",
  destructive: "text-st-corr-fg",
  inverted: "text-ink",
};

export const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    iconOnly = false,
    loading = false,
    disabled = false,
    asChild = false,
    type = "button",
    className,
    children,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      ref={ref}
      type={asChild ? undefined : type}
      disabled={asChild ? undefined : disabled}
      aria-busy={loading || undefined}
      className={cn(
        "focus-halo relative inline-flex shrink-0 items-center justify-center gap-8 border font-ui font-medium whitespace-nowrap no-underline select-none",
        "transition-[background-color,border-color,transform] duration-[120ms,120ms,80ms] ease-[linear,linear,var(--ease-out)]",
        "disabled:cursor-not-allowed",
        SIZES[size],
        iconOnly && cn(ICON_SIZES[size], "px-0"),
        VARIANTS[variant],
        loading && "pointer-events-none",
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span
            className={cn(
              "inline-flex items-center gap-8",
              loading && "opacity-40",
            )}
          >
            {children}
          </span>
          {loading && <Spinner className={SPINNER_TONES[variant]} />}
        </>
      )}
    </Component>
  );
});

// 12px, 2px stroke; size held so the button never changes width.
function Spinner({ className }) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        className,
      )}
    >
      <svg
        viewBox="0 0 12 12"
        className="size-[12px]! animate-spin"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 1a5 5 0 0 1 5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
        />
      </svg>
    </span>
  );
}
