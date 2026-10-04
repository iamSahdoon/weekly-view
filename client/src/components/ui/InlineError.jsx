import { cn } from "../../lib/cn.js";
import { Button } from "./Button.jsx";

// Design §6.15: what failed, the cause in plain words, `Try again`. No apology;
// the code only when it helps, in mono at the foot.

export function InlineError({ title, children, onRetry, code, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "border border-l-2 border-st-corr-bd border-l-st-corr-fg bg-st-corr-bg px-24 py-20",
        className,
      )}
    >
      <p className="text-base font-medium text-ink">{title}</p>
      {children && <div className="mt-4 text-dense text-body">{children}</div>}
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-14"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
      {code && <p className="mt-14 font-mono text-micro text-mut">{code}</p>}
    </div>
  );
}
