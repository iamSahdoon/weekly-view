import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

// The body of an auth screen (design §3.12): a Chivo 700 28px heading, an
// optional --mut line, the panel, then one secondary text link.

export function AuthScreen({ heading, line, footer, children }) {
  useDocumentTitle(heading);
  return (
    <>
      <h1 className="font-display text-page font-bold text-ink">{heading}</h1>
      {line && <p className="mt-8 text-base text-mut">{line}</p>}
      <div className="mt-24">{children}</div>
      {footer && <div className="mt-20 text-dense">{footer}</div>}
    </>
  );
}

export function AuthPanel({ children }) {
  return (
    <div className="border border-hair bg-card p-32 max-xs:p-20">
      {children}
    </div>
  );
}
