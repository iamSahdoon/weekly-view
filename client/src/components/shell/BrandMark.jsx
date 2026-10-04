import { cn } from "../../lib/cn.js";

// The bracketed-bar glyph (brand §1.3): brackets in ink, the bar in cobalt.
// Static — it never pulses or blinks. With `wordmark`, the glyph and WeeklyView
// in Chivo 800 (design §3.12, §1.3). The glyph appears with the wordmark and
// nowhere else, except alone on the boot splash.

export function BrandMark({ wordmark = true, glyphSize = 20, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-8 font-display font-extrabold tracking-[-.045em] text-ink",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width={glyphSize}
        height={glyphSize}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        aria-hidden="true"
      >
        <path d="M7 4H4v16h3M17 4h3v16h-3" />
        <path d="M12 8v8" stroke="var(--acc)" strokeWidth="2.6" />
      </svg>
      {wordmark ? "WeeklyView" : <span className="sr-only">WeeklyView</span>}
    </span>
  );
}
