import { motion as Motion } from "motion/react";
import { useId, useRef } from "react";
import { cn } from "../../lib/cn.js";

// Design §6.14: underline, not pills; a 44px row with a 1px --hair rule under the
// whole container. The active bar slides 180ms --ease-out (Motion layoutId) —
// user-triggered, and it shows what changed. Roving tabindex, role="tablist".
// Used for profile sub-views, never as a substitute for navigation.

export function Tabs({
  value,
  onChange,
  items,
  ariaLabel,
  className,
  ...props
}) {
  const group = useId();
  const refs = useRef([]);

  const move = (event, index) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1 };
    let next;
    if (event.key in keys) {
      next = index;
      for (let i = 0; i < items.length; i += 1) {
        next = (next + keys[event.key] + items.length) % items.length;
        if (!items[next].disabled) break;
      }
    } else if (event.key === "Home") next = items.findIndex((i) => !i.disabled);
    else if (event.key === "End")
      next = items.findLastIndex((i) => !i.disabled);
    else return;
    event.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex h-44 items-stretch border-b border-hair", className)}
      {...props}
    >
      {items.map((item, index) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => (refs.current[index] = el)}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            title={item.title}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "focus-inset group relative px-16 font-ui text-base font-medium whitespace-nowrap max-sm:px-11",
              "transition-colors duration-[120ms] ease-linear",
              active ? "text-ink" : "text-mut enabled:hover:text-ink",
              "disabled:cursor-not-allowed disabled:text-mut",
            )}
          >
            {item.label}
            {!active && !item.disabled && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-2 bg-transparent group-hover:bg-hair2"
              />
            )}
            {active && (
              <Motion.span
                layoutId={`tab-bar-${group}`}
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-2 bg-acc"
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
