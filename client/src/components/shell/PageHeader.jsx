import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { usePageChrome } from "../../context/PageChromeContext.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";
import { Breadcrumb } from "../ui/Breadcrumb.jsx";

// A page's title, back-link, week picker and actions, portalled into the TopBar's
// slots (frontend_architecture.md §7.3). It renders nothing in place and sets
// document.title to "{title} · WeeklyView". One primary action per page
// (design §11 rule 3); the title is the text of the top bar's <h1>.
//
//   back        { label, to } — the second-level back-link (line 1)
//   breadcrumb  [{ label, to }] — the one three-level route, instead of `back`

export function PageHeader({
  title,
  back,
  breadcrumb,
  weekPicker,
  secondary,
  primary,
}) {
  const { slots, setHasSecondary } = usePageChrome();
  useDocumentTitle(title);

  const hasSecondary = Boolean(secondary);
  useEffect(() => {
    setHasSecondary(hasSecondary);
    return () => setHasSecondary(false);
  }, [hasSecondary, setHasSecondary]);

  return (
    <>
      {slots.back &&
        (breadcrumb || back) &&
        createPortal(
          breadcrumb ? (
            <Breadcrumb items={breadcrumb} />
          ) : (
            <Link
              to={back.to}
              className="inline-flex items-center gap-4 underline-offset-2 hover:text-ink hover:underline"
            >
              <ChevronLeft aria-hidden="true" className="size-[12px]" />
              {back.label}
            </Link>
          ),
          slots.back,
        )}
      {slots.title && createPortal(title, slots.title)}
      {slots.weekPicker &&
        weekPicker &&
        createPortal(weekPicker, slots.weekPicker)}
      {slots.secondary && secondary && createPortal(secondary, slots.secondary)}
      {slots.primary && primary && createPortal(primary, slots.primary)}
    </>
  );
}
