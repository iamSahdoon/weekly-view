import { motion as Motion } from "motion/react";
import { useId, useRef } from "react";
import { cn } from "../../lib/cn.js";

// A two- or three-option switch: Days | Hours, Asked for approval | All
// submitted, Light | Dark (frontend_architecture.md §8.1). A radiogroup with a
// roving tabindex; arrows move and select. Selection is --acc-l with --acc-txt,
// as the active nav item is. Polish (2026-10-10): the selection slides to the option
// chosen (180ms --ease-out, Motion layoutId) — it shows what changed; under reduced
// motion it moves at once (MotionConfig).

const SIZES = {
  sm: "h-[var(--ctrl-h-sm)] px-11 text-dense",
  md: "h-[var(--ctrl-h)] px-16 text-base",
};

export function SegmentedControl({
  value,
  onChange,
  options,
  ariaLabel,
  size = "sm",
  className,
}) {
  const refs = useRef([]);
  const group = useId();
  const move = (event, index) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-stretch divide-x divide-hair border border-rule bg-card",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => (refs.current[index] = el)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "focus-inset relative font-ui font-medium whitespace-nowrap transition-[background-color,color] duration-[120ms] ease-linear",
              SIZES[size],
              selected
                ? "text-acc-txt"
                : "text-body hover:bg-tint hover:text-ink",
            )}
          >
            {selected && (
              <Motion.span
                layoutId={`segment-${group}`}
                aria-hidden="true"
                className="absolute inset-0 bg-acc-l"
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
