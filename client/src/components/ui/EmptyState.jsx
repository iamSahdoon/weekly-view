import { cn } from "../../lib/cn.js";

// Design §6.17: no eyebrow, illustration, icon or emoji. One action, or none.

export function EmptyState({ title, children, action, className }) {
  return (
    <div className={cn("mx-auto max-w-[420px] py-52 text-center", className)}>
      <p className="font-display text-panel font-bold text-ink">{title}</p>
      {children && <div className="mt-8 text-base text-body">{children}</div>}
      {action && <div className="mt-20 flex justify-center">{action}</div>}
    </div>
  );
}
