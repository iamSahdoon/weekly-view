import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

// The body of an auth screen (design §3.12; owner decision, auth pages 2026-10-17): a
// large, quiet Chivo 700 heading (40px, 28px on phones), an optional --mut line, the
// panel, then the secondary links. `title` is the tab's title when it should be shorter
// than the heading ("Sign in", not "Sign in to WeeklyView").

export function AuthScreen({ heading, title, line, footer, children }) {
  useDocumentTitle(title ?? heading);
  return (
    <>
      <h1 className="font-display text-page font-bold text-ink sm:text-title">
        {heading}
      </h1>
      {line && <p className="mt-11 text-lg text-mut sm:mt-14">{line}</p>}
      <div className="mt-32">{children}</div>
      {footer && (
        <div className="mt-20 flex flex-col items-start gap-11 text-dense">
          {footer}
        </div>
      )}
    </>
  );
}

export function AuthPanel({ padding = "default", children }) {
  return (
    <div
      className={
        padding === "none"
          ? "border border-hair bg-card"
          : "border border-hair bg-card p-32 max-xs:p-20"
      }
    >
      {children}
    </div>
  );
}
