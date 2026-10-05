import { cn } from "../../lib/cn.js";

// The key toggle (design §4.5): 26×26, zero radius, 1px --rule, a 10×10 outline square
// in --mut. Selected: --acc-l with an --acc border and the inner square filled. It
// behaves as a radio inside its row list's `role="radiogroup"`, but a second click
// clears it, because flagging is optional (frontend_architecture.md §6.4). It never
// uses the brand glyph. The row adds the 2px --acc bar and the word `Key`.

export function KeyFlag({ checked, onToggle, label }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "focus-halo group flex size-[26px] shrink-0 items-center justify-center border transition-colors duration-[160ms] ease-linear",
        checked
          ? "border-acc bg-acc-l"
          : "border-rule bg-transparent hover:border-hair2",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block size-[10px] border transition-colors duration-[160ms] ease-linear",
          checked ? "border-acc bg-acc" : "border-mut group-hover:border-body",
        )}
      />
    </button>
  );
}
