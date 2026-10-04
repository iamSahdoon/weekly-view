import { forwardRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import { inputClasses } from "./inputClasses.js";

// Design §6.3. Auto-grow is off: a jumping layout is worse than a scrollbar.

export const Textarea = forwardRef(function Textarea(
  { showCount = false, maxLength, className, onChange, ...props },
  ref,
) {
  const [length, setLength] = useState(
    String(props.value ?? props.defaultValue ?? "").length,
  );
  const count = props.value != null ? String(props.value).length : length;
  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={ref}
        maxLength={maxLength}
        onChange={(event) => {
          setLength(event.target.value.length);
          onChange?.(event);
        }}
        className={cn(
          inputClasses,
          "min-h-[96px] resize-y px-[12px] py-11 leading-[1.55]",
          showCount && "pb-26",
        )}
        {...props}
      />
      {showCount && maxLength && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-11 bottom-6 font-mono text-micro text-mut",
            count >= maxLength && "text-st-corr-fg",
          )}
        >
          {count}/{maxLength}
        </span>
      )}
    </div>
  );
});
