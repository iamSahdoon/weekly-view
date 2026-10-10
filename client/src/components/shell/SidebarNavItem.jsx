import { motion as Motion } from "motion/react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { NewMarker } from "../ui/NewMarker.jsx";
import { Tooltip } from "../ui/Tooltip.jsx";

// Design §1.3. 38px, 14px Instrument Sans, a 16px / 1.5px icon in --mut. Active:
// --acc-l with --acc-txt and a 2px --acc left bar; weight stays 400 — the bar and
// tint carry the state. In the rail it is icon-only and the label is a tooltip.
// `dot` is the 6×6 "new" square (no number); `count` is mono 11px, absent at zero.
// Polish (2026-10-10): the tint and bar are one layer that slides from the page you
// left to the page you opened (200ms --ease-out, Motion layoutId), so the eye follows
// the move; under reduced motion it jumps (MotionConfig).

export function SidebarNavItem({
  to,
  label,
  icon: Icon,
  active,
  rail,
  dot,
  count,
  onNavigate,
}) {
  const link = (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={rail ? label : undefined}
      className={cn(
        "focus-inset relative flex h-[38px] items-center gap-11 text-base no-underline",
        "transition-colors duration-[120ms] ease-linear",
        rail ? "justify-center" : "px-20",
        active ? "text-acc-txt" : "text-body hover:bg-tint hover:text-ink",
      )}
    >
      {active && (
        <Motion.span
          layoutId="nav-active"
          aria-hidden="true"
          data-testid="nav-active"
          className="absolute inset-0 bg-acc-l before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-acc"
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        />
      )}
      <Icon
        aria-hidden="true"
        strokeWidth={1.5}
        className={cn("relative size-[16px] shrink-0", !active && "text-mut")}
      />
      {!rail && (
        <span className="relative min-w-0 flex-1 truncate">{label}</span>
      )}
      {!rail && count > 0 && (
        <span className="relative font-mono text-micro text-mut tabular-nums">
          <span className="sr-only">{count} waiting, </span>
          <span aria-hidden="true">{count}</span>
        </span>
      )}
      {dot && (
        <NewMarker
          className={cn("relative", rail && "absolute top-11 right-[14px]")}
        />
      )}
    </Link>
  );
  return rail ? (
    <Tooltip content={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}
