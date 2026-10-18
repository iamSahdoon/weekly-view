import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { WEEKDAY_LABELS } from "../../lib/constants.js";
import { cn } from "../../lib/cn.js";

// The weekly form's rail (design §4.2): 200px, sticky under the top bar, shown from
// 1280px. One row per section — mono number + name — default --mut; complete --body
// with a 2px --acc bar; current --ink on --tint; with errors --st-corr-fg and a 2px
// --st-corr-fg bar. Beneath it the submit checklist in plain words, each line ticked as
// it is met, so a disabled Submit explains itself; a missing day links to the day panel.
//
//   sections   [{ id, number, title, complete, hasError }]
//   checklist  submitChecklist(); `dayError` marks the days line after R7's 422

export function SectionRail({
  sections,
  checklist,
  activeId,
  weekKey,
  dayError = false,
}) {
  const jump = (event, id) => {
    const node = document.getElementById(id);
    if (!node) return;
    event.preventDefault();
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    node.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <nav
      aria-label="Report sections"
      className="sticky top-[calc(94px+var(--demo-h,0px))] flex w-[200px] flex-col gap-24"
    >
      <ol className="flex flex-col">
        {sections.map((s) => {
          const current = s.id === activeId;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(event) => jump(event, s.id)}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "focus-halo relative flex h-[32px] items-center gap-11 pl-11 text-dense",
                  "before:absolute before:inset-y-0 before:left-0 before:w-2",
                  s.hasError
                    ? "text-st-corr-fg before:bg-st-corr-fg"
                    : s.complete
                      ? "text-body before:bg-acc"
                      : "text-mut",
                  current && "bg-tint",
                  current && !s.hasError && "text-ink",
                )}
              >
                <span className="font-mono text-micro">{s.number}</span>
                {s.title}
              </a>
            </li>
          );
        })}
      </ol>

      <div
        data-tour="submit-checklist"
        className="flex flex-col gap-8 border-t border-hair pt-14"
      >
        <p className="text-micro font-medium text-mut">Before you submit</p>
        <ul className="flex flex-col gap-6">
          {checklist.items.map((item) => {
            const error = item.id === "days" && dayError && !item.met;
            return (
              <li key={item.id} className="flex flex-col gap-4">
                <span
                  className={cn(
                    "flex items-start gap-8 text-caption",
                    item.met
                      ? "text-body"
                      : error
                        ? "text-st-corr-fg"
                        : "text-mut",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-[2px] flex size-[12px] shrink-0 items-center justify-center border",
                      item.met
                        ? "border-acc bg-acc text-on-acc"
                        : "border-rule",
                    )}
                  >
                    {item.met && (
                      <Check className="size-[10px]" strokeWidth={3} />
                    )}
                  </span>
                  <span>
                    {item.label}
                    <span className="sr-only">
                      {item.met ? " — done" : " — not yet"}
                    </span>
                  </span>
                </span>
                {item.id === "days" && !item.met && (
                  <span className="flex flex-wrap gap-x-8 pl-20 text-caption">
                    {checklist.missingDays.map((day) => (
                      <Link
                        key={day}
                        to={`/?week=${weekKey}&day=${day}`}
                        className="text-acc-txt underline-offset-2 hover:underline"
                      >
                        {WEEKDAY_LABELS[day]}
                      </Link>
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
