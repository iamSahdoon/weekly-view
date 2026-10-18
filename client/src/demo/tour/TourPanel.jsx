import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronRight, X } from "lucide-react";
import { Button } from "../../components/ui/Button.jsx";
import { cn } from "../../lib/cn.js";
import { AUDIENCES, CHAPTERS, STEPS, tourMinutes } from "./tourSteps.js";

// The jump panel (owner request, 2026-10-17; design §3.14 "Guided tour"): every feature
// of the tour, grouped by who can use it — Everyone, Managers and admins, Admins only —
// so a visitor sees at a glance what each role can do, and can open any one of them.
// Above the list: resume where they left off, start again, or end the tour. A modal
// sheet on the right from 640px, the full width below; Radix traps focus, Esc closes it
// and focus goes back to whatever opened it.

const GROUPS = ["everyone", "managers", "admins"];
const WHO = Object.fromEntries(CHAPTERS.map((c) => [c.id, c.who]));

// A chapter's opening line isn't a feature; the rest of the steps are.
const FEATURE_STEPS = STEPS.map((step, index) => ({ step, index })).filter(
  ({ step }) => !step.intro || step.features.length > 0,
);

export function TourPanel({
  open,
  onOpenChange,
  container,
  active,
  current,
  resume,
  visited,
  onJump,
  onResume,
  onRestart,
  onEnd,
}) {
  const minutes = tourMinutes();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="wv-backdrop fixed inset-0 z-[63] bg-[var(--backdrop)]" />
        <Dialog.Content
          className={cn(
            "wv-fade-in fixed inset-y-0 right-0 z-[64] flex w-full flex-col border-l border-hair2 bg-card shadow-[var(--shadow-pop)] outline-none",
            "sm:w-[420px]",
          )}
        >
          <header className="flex shrink-0 items-start justify-between gap-11 border-b border-hair px-24 py-16 max-sm:px-16">
            <div className="flex min-w-0 flex-col gap-4">
              <Dialog.Title className="font-display text-sub font-bold text-ink">
                Guided tour
              </Dialog.Title>
              <Dialog.Description className="text-dense text-body">
                One team’s week, about {minutes} minutes. Or jump to any part:
                each is grouped by who can use it.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" iconOnly aria-label="Close">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>

          <div className="flex shrink-0 flex-wrap items-center gap-8 border-b border-hair bg-tint px-24 py-14 max-sm:px-16">
            {resume != null && !active ? (
              <>
                <Button size="sm" onClick={onResume}>
                  Resume at step {resume + 1}
                </Button>
                <Button variant="secondary" size="sm" onClick={onRestart}>
                  Start again
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={onRestart}>
                {active ? "Start again" : "Start the tour"}
              </Button>
            )}
            {(active || resume != null) && (
              <Button variant="ghost" size="sm" onClick={onEnd}>
                End the tour
              </Button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {GROUPS.map((audience) => {
              const items = FEATURE_STEPS.filter(
                ({ step }) => step.audience === audience,
              );
              return (
                <section
                  key={audience}
                  aria-labelledby={`tour-group-${audience}`}
                  className="border-b border-hair last:border-b-0"
                >
                  <h3
                    id={`tour-group-${audience}`}
                    className="flex items-baseline justify-between gap-8 px-24 pt-16 pb-6 max-sm:px-16"
                  >
                    <span className="font-display text-panel-sm font-bold text-ink">
                      {AUDIENCES[audience]}
                    </span>
                    <span className="text-caption text-mut tabular-nums">
                      {items.length}
                    </span>
                  </h3>
                  <ul className="pb-8">
                    {items.map(({ step, index }) => {
                      const isCurrent = active && index === current;
                      const seen = visited.includes(step.id);
                      return (
                        <li key={step.id}>
                          <button
                            type="button"
                            onClick={() => onJump(index)}
                            aria-current={isCurrent ? "step" : undefined}
                            className={cn(
                              "focus-inset group relative flex min-h-[40px] w-full items-center gap-11 px-24 py-6 text-left max-sm:px-16",
                              "transition-colors duration-[120ms] ease-linear hover:bg-tint",
                              isCurrent &&
                                "bg-acc-l before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-acc",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className="w-[22px] shrink-0 text-caption text-mut tabular-nums"
                            >
                              {index + 1}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span
                                className={cn(
                                  "text-dense",
                                  isCurrent
                                    ? "font-medium text-acc-txt"
                                    : "text-ink",
                                )}
                              >
                                {step.title}
                              </span>
                              <span className="text-caption text-mut">
                                As {WHO[step.chapter]}
                              </span>
                            </span>
                            {seen && (
                              <>
                                <span className="sr-only">Seen</span>
                                <Check
                                  aria-hidden="true"
                                  className="size-[14px] shrink-0 text-mut"
                                  strokeWidth={2}
                                />
                              </>
                            )}
                            <ChevronRight
                              aria-hidden="true"
                              className="size-[14px] shrink-0 text-mut transition-transform duration-[160ms] ease-[var(--ease-out)] group-hover:translate-x-2"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
