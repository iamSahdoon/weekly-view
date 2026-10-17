import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

// The body of an auth screen (design §3.12; owner decisions, auth pages 2026-10-17): a
// large, quiet Chivo 700 heading (40px, 28px on phones) with an optional --mut line, the
// panel, then the secondary links. `title` is the tab's title when it should be shorter
// than the heading ("Sign in", not "Sign in to WeeklyView"). From 1024px its three parts
// are three rows of AuthLayout's shared grid — the heading, the panel (level with the brand
// panel's sample card) and the links (level with its caption) — so they are three
// elements, spaced by their own padding. A screen whose body is only a button (sign-up
// closed) passes `compact`: its link then follows the button in the same row instead of
// waiting at the bottom of the pair.

export function AuthScreen({
  heading,
  title,
  line,
  footer,
  compact = false,
  children,
}) {
  useDocumentTitle(title ?? heading);
  return (
    <>
      <div className="pb-32">
        <h1 className="font-display text-page font-bold text-ink sm:text-title">
          {heading}
        </h1>
        {line && <p className="mt-11 text-lg text-mut sm:mt-14">{line}</p>}
      </div>
      {compact ? (
        <div>
          {children}
          {footer && <Footer>{footer}</Footer>}
        </div>
      ) : (
        <>
          <div>{children}</div>
          {footer && <Footer>{footer}</Footer>}
        </>
      )}
    </>
  );
}

function Footer({ children }) {
  return (
    <div className="flex flex-col items-start gap-11 pt-20 text-dense">
      {children}
    </div>
  );
}

export function AuthPanel({ padding = "default", children }) {
  return (
    <div
      className={
        padding === "none"
          ? "border border-hair bg-card"
          : // lg:h-full: as tall as its row, so it ends level with the sample card.
            "border border-hair bg-card p-32 max-xs:p-20 lg:h-full"
      }
    >
      {children}
    </div>
  );
}
