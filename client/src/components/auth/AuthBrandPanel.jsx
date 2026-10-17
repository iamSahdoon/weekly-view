import { motion as Motion, useReducedMotion } from "motion/react";
import { WEEKDAYS, WEEKDAY_SHORT } from "../../lib/constants.js";
import { cn } from "../../lib/cn.js";
import { DaySquare } from "../dashboard/UpdatesCell.jsx";
import { BrandMark } from "../shell/BrandMark.jsx";

// The auth screens' brand panel (owner decision, auth pages 2026-10-17; design §3.12): the
// wordmark, one plain line, and a week of Updates squares that fill in Monday to Friday
// once, when the screen opens — the product's own language, in its own palette. The one
// entrance the product allows on load (design §8.5, entry 32): five squares, opacity and a
// small scale, 200ms each, 120ms apart, then still. Under reduced motion they are drawn
// filled. Decorative: the sentence beside it says what it means. From 1024px only; below
// that the layout's slim header stands in for it.

const EASE = [0.2, 0, 0, 1];
const FIRST = 0.3;
const STEP = 0.12;

export function AuthBrandPanel({ className }) {
  const still = useReducedMotion();
  return (
    <aside
      aria-label="About WeeklyView"
      className={cn(
        "sticky top-0 flex h-[100dvh] flex-col border-l border-hair bg-card px-52 pt-32 pb-52",
        className,
      )}
    >
      {/* On the same line as the form side's "Back to home". */}
      <div className="flex min-h-[32px] items-center">
        <BrandMark className="text-[22px]" glyphSize={22} />
      </div>
      <div className="my-auto w-full max-w-[380px]">
        <div
          aria-hidden="true"
          className="grid grid-cols-5 divide-x divide-hair border border-hair"
        >
          {WEEKDAYS.map((weekday, i) => (
            <div
              key={weekday}
              className="flex flex-col items-center gap-11 py-16"
            >
              <span className="text-dense font-medium text-body">
                {WEEKDAY_SHORT[weekday]}
              </span>
              <span className="relative size-[22px]">
                <DaySquare
                  state="future"
                  className="absolute inset-0 size-full"
                />
                <Motion.span
                  className="absolute inset-0"
                  initial={still ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: FIRST + i * STEP,
                    duration: 0.2,
                    ease: EASE,
                  }}
                >
                  <DaySquare state="posted" className="size-full" />
                </Motion.span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-32 font-display text-sub font-bold text-ink">
          One short update a day.
        </p>
        <p className="mt-8 text-base text-body">
          Each person posts what they did, and Friday&rsquo;s weekly report
          builds itself from the five days.
        </p>
      </div>
    </aside>
  );
}
