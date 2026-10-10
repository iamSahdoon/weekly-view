import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { SampleDataPill } from "./SampleDataPill.jsx";

// Design §6.9. Panels do not nest; no shadow. `sample` marks a panel that holds data:
// in the demo its header carries the SAMPLE DATA pill (design §3.14).

const PADDING = { default: "p-24", dense: "p-20", none: "p-0" };

export const Panel = forwardRef(function Panel(
  {
    title,
    actions,
    sample = false,
    footer,
    padding = "default",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <section
      ref={ref}
      className={cn("border border-hair bg-card", className)}
      {...props}
    >
      {(title || actions) && (
        // 44px, and on a narrow screen the actions wrap under the title rather than
        // squeezing it onto two lines (polish, 2026-10-10).
        <header className="flex min-h-44 flex-wrap items-center justify-between gap-x-11 gap-y-6 border-b border-hair px-20 py-6">
          {title && (
            <div className="flex min-w-0 items-center gap-8">
              <h2 className="font-display text-panel font-bold whitespace-nowrap text-ink">
                {title}
              </h2>
              {sample && <SampleDataPill />}
            </div>
          )}
          {actions && <div className="flex items-center gap-8">{actions}</div>}
        </header>
      )}
      <div className={PADDING[padding]}>{children}</div>
      {footer && (
        <footer className="flex h-44 items-center justify-end gap-11 border-t border-hair bg-tint px-20">
          {footer}
        </footer>
      )}
    </section>
  );
});
