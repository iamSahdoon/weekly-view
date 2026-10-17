import { X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { cn } from "../../lib/cn.js";
import { AUDIENCES, CHAPTERS, PERSONAS, STEPS } from "./tourSteps.js";

// The tour's tooltip (owner request, 2026-10-17; design §3.14 "Guided tour"): a floating
// card beside the highlighted element on a wide screen, a sheet across the bottom (or
// top) of a phone. A labelled, non-modal dialog: the chapter, who the feature is for,
// the title, one or two sentences, what to press, and Back · Do it for me · Next · Exit.
// It sits above the page's own dialogs and menus, so pointer and focus events that start
// in it stop here — they would otherwise close a menu the step is about, or be pulled
// back by a dialog's focus trap.

const ISOLATED = ["pointerdown", "mousedown", "touchstart", "focusin"];

export const TourTooltip = forwardRef(function TourTooltip(
  {
    step,
    index,
    phase,
    done,
    doing,
    doError,
    sheet,
    style,
    onBack,
    onNext,
    onDoIt,
    onExit,
    onRetry,
    onFinish,
    onTabOut,
  },
  ref,
) {
  const root = useRef(null);
  useImperativeHandle(ref, () => root.current);

  useEffect(() => {
    const el = root.current;
    const stop = (event) => event.stopPropagation();
    ISOLATED.forEach((type) => el.addEventListener(type, stop));
    return () => ISOLATED.forEach((type) => el.removeEventListener(type, stop));
  }, []);

  const chapterIndex = CHAPTERS.findIndex((c) => c.id === step.chapter);
  const chapter = CHAPTERS[chapterIndex];
  const away = phase === "missing" || phase === "lost";
  const view = done && step.action?.done ? step.action.done : step;
  const waiting = step.action && !done && !away;
  const titleId = `tour-title-${step.id}`;
  const bodyId = `tour-body-${step.id}`;

  // ←/→ move through the steps from anywhere in the card; Tab past the last control
  // reaches the highlighted element, so it can be used from the keyboard.
  const onKeyDown = (event) => {
    if (event.target.closest("a, textarea, input")) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (!step.finish) onNext();
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      onBack();
    } else if (event.key === "Tab" && !event.shiftKey) {
      const controls = root.current.querySelectorAll(
        "button:not(:disabled), a[href]",
      );
      if (event.target === controls[controls.length - 1] && onTabOut()) {
        event.preventDefault();
      }
    }
  };

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-sheet={sheet ?? undefined}
      style={style}
      className={cn(
        // Each step fades in (120ms, opacity only); it never travels between steps.
        "wv-fade-in pointer-events-auto fixed z-[62] flex flex-col gap-11 border border-hair2 bg-card p-20 text-left shadow-[var(--shadow-pop)] outline-none",
        sheet
          ? cn(
              "inset-x-0 max-h-[55dvh] overflow-y-auto px-16 py-16",
              // A top sheet sits under the demo bar, which stays in reach.
              sheet === "top"
                ? "top-[var(--demo-h,0px)]"
                : "bottom-0 border-b-0",
            )
          : "w-[360px] max-w-[calc(100vw-24px)]",
      )}
    >
      <div className="flex items-start justify-between gap-11">
        <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-4">
          <span className="text-caption text-mut">
            <span className="font-mono">0{chapterIndex + 1}</span>{" "}
            {chapter.title}
          </span>
          <span className="inline-block border border-hair bg-tint px-6 py-2 text-micro leading-none font-medium whitespace-nowrap text-body">
            {AUDIENCES[step.audience]}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="-mt-6 -mr-8 shrink-0"
          aria-label="Exit the tour"
        >
          Exit
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <h2 id={titleId} className="font-display text-panel font-bold text-ink">
          {view.title ?? step.title}
        </h2>
        <p id={bodyId} className="text-base text-body">
          {view.body}
          {away && (
            <span className="mt-6 block text-dense text-mut">
              {phase === "missing"
                ? "This part of the screen didn’t appear."
                : "This part of the screen has closed."}
            </span>
          )}
        </p>
        {waiting && step.action.hint && (
          <p className="flex items-center gap-8 text-dense text-ink">
            <span
              aria-hidden="true"
              className="inline-block size-[6px] shrink-0 bg-acc"
            />
            {step.action.hint}
          </p>
        )}
        {doError && (
          <p role="alert" className="text-dense text-st-corr-fg">
            {doError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-11 gap-y-8 pt-4">
        <span className="text-caption text-mut tabular-nums">
          Step {index + 1} of {STEPS.length} · {PERSONAS[step.as]}
        </span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-8">
          {index > 0 && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          {away ? (
            <>
              <Button variant="secondary" size="sm" onClick={onRetry}>
                {phase === "missing" ? "Try again" : "Show it again"}
              </Button>
              <Button size="sm" onClick={onNext}>
                Skip this step
              </Button>
            </>
          ) : step.finish ? (
            <>
              <Button variant="secondary" size="sm" asChild>
                <a href="/signup">Create your account</a>
              </Button>
              <Button size="sm" onClick={onFinish}>
                Explore on your own
              </Button>
            </>
          ) : (
            <>
              {waiting && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={doing}
                  onClick={onDoIt}
                >
                  Do it for me
                </Button>
              )}
              <Button size="sm" disabled={doing} onClick={onNext}>
                Next
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
