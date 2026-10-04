import { CircleAlert } from "lucide-react";
import { Children, cloneElement, isValidElement, useId } from "react";
import { cn } from "../../lib/cn.js";

// Wraps every control (frontend_architecture.md §6.1, design §4.7): label above,
// "Optional" right, helper text, the error below with aria wired. No asterisks.

export function Field({
  label,
  optional = false,
  helper,
  error,
  id: idProp,
  className,
  children,
}) {
  const generated = useId();
  const id = idProp ?? generated;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const message = typeof error === "string" ? error : error?.message;
  const describedBy = message ? errorId : helper ? helperId : undefined;

  const control = Children.only(children);
  const wired = isValidElement(control)
    ? cloneElement(control, {
        id,
        "aria-invalid": message ? true : undefined,
        "aria-describedby": describedBy,
      })
    : control;

  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <div className="mb-6 flex items-baseline justify-between gap-8">
          <label htmlFor={id} className="text-dense font-medium text-ink">
            {label}
          </label>
          {optional && <span className="text-micro text-mut">Optional</span>}
        </div>
      )}
      {wired}
      {message ? (
        <p
          id={errorId}
          className="mt-6 flex items-center gap-4 text-caption text-st-corr-fg motion-safe:animate-[wv-fade-in_120ms_linear]"
        >
          <CircleAlert aria-hidden="true" className="size-[12px] shrink-0" />
          {message}
        </p>
      ) : (
        helper && (
          <p id={helperId} className="mt-6 text-caption text-mut">
            {helper}
          </p>
        )
      )}
    </div>
  );
}
