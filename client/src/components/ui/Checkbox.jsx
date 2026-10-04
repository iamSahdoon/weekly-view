import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "../../lib/cn.js";

// Design §6.6: 16px, square, a 10px check at 2px stroke; opacity only — no draw.
// The whole label is the hit area (≥ 24px).

export const Checkbox = forwardRef(function Checkbox(
  { label, indeterminate = false, className, ...props },
  ref,
) {
  const inner = useRef(null);
  useImperativeHandle(ref, () => inner.current);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={cn(
        "inline-flex min-h-[24px] items-center gap-8 text-dense text-body",
        props.disabled ? "cursor-not-allowed text-mut" : "cursor-pointer",
        className,
      )}
    >
      <span className="relative inline-flex size-16 shrink-0">
        <input
          ref={inner}
          type="checkbox"
          className={cn(
            "peer focus-halo size-16 appearance-none border border-rule bg-card",
            "enabled:hover:border-hair2 enabled:hover:bg-tint",
            "checked:border-acc checked:bg-acc enabled:checked:hover:border-acc enabled:checked:hover:bg-acc",
            "indeterminate:border-acc indeterminate:bg-acc",
            "disabled:cursor-not-allowed disabled:border-hair disabled:bg-tint2",
          )}
          {...props}
        />
        <svg
          viewBox="0 0 10 10"
          aria-hidden="true"
          className="pointer-events-none absolute top-[3px] left-[3px] size-[10px] text-on-acc opacity-0 transition-opacity duration-[120ms] peer-checked:opacity-100 peer-indeterminate:opacity-0! peer-disabled:text-mut"
        >
          <path
            d="M1 5.2 4 8l5-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[7px] left-[4px] h-[2px] w-8 bg-on-acc opacity-0 transition-opacity duration-[120ms] peer-indeterminate:opacity-100 peer-disabled:bg-mut"
        />
      </span>
      {label}
    </label>
  );
});
