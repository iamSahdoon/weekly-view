import { cn } from "../../lib/cn.js";

// Design §6.17: no eyebrow, illustration, icon or emoji. One action, or none.
// Owner decision (polish, 2026-10-10): above the title sits the product's own mark,
// five small Updates squares — a week still to fill (`new`, the first square in the
// cobalt "today" outline) or a week with nothing in it (`filtered`, all faint). It is
// the squares' language, not a picture, so it is the same in both themes and says
// nothing a screen reader needs (aria-hidden). `mark={false}` leaves it out; `system`
// (a page that isn't there or isn't yours) draws five plain squares.

export function EmptyState({
  title,
  children,
  action,
  variant = "new",
  mark = true,
  fill = false,
  className,
}) {
  return (
    <div
      className={cn(
        "mx-auto max-w-[420px] py-52 text-center",
        // A whole-page state (404, 403): optically centred in the content area, a
        // little above the middle, instead of sitting under the bar with dead space.
        fill &&
          "flex min-h-[calc(100dvh-var(--bar-h)-var(--demo-h,0px)-120px)] flex-col justify-center pt-0 pb-[10vh]",
        className,
      )}
    >
      {mark && <WeekMark variant={variant} />}
      <p className="font-display text-panel font-bold text-ink">{title}</p>
      {children && <div className="mt-8 text-base text-body">{children}</div>}
      {action && <div className="mt-20 flex justify-center">{action}</div>}
    </div>
  );
}

function WeekMark({ variant }) {
  return (
    <span
      aria-hidden="true"
      data-testid="empty-mark"
      className="mb-16 flex justify-center gap-4"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "size-[10px] border",
            variant === "new" && i === 0
              ? "border-2 border-acc"
              : variant === "filtered"
                ? "border-dashed border-rule"
                : "border-rule",
          )}
        />
      ))}
    </span>
  );
}
