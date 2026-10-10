// Design §1.7: the first focusable element. Visually hidden until focused, then a
// cobalt-outlined button at 16px / 16px.

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-16 focus:left-16 focus:z-50 focus:inline-flex focus:h-[var(--ctrl-h)] focus:items-center focus:border focus:border-acc focus:bg-card focus:px-16 focus:text-base focus:font-medium focus:text-ink print:hidden"
    >
      Skip to content
    </a>
  );
}
