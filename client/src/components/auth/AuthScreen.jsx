import { useContext } from "react";
import { useArrivedInTransition } from "../../hooks/useArrivedInTransition.js";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";
import { cn } from "../../lib/cn.js";
import { AuthIntroContext, useAuthIntro } from "./authIntro.js";

// The body of an auth screen (design §3.12; owner decisions, auth pages 2026-10-17): a
// large, quiet Chivo 700 heading (40px, 28px on phones) with an optional --mut line, the
// panel, then the secondary links. `title` is the tab's title when it should be shorter
// than the heading ("Sign in", not "Sign in to WeeklyView"). `intro` names the brand
// panel's line for this screen (panelIntros.js).
//
// From 1024px its three parts are three rows of AuthLayout's shared grid — the heading,
// the panel (its bottom level with the sample card's) and the links (level with the
// caption). A short screen — `compact` (sign-up closed: one button), or an expired link or
// a lost answer showing in place of the form (the panel's override) — keeps its parts
// together instead: one element across the heading and panel rows, so the brand side's
// taller column can't open gaps between them. The element tree is the same either way
// (the wrapper is `display: contents` when not short), so nothing remounts. Each part comes
// in on the arrival stagger (`.wv-stagger`, round six); a change of screen replays it.

export function AuthScreen({
  heading,
  title,
  line,
  footer,
  compact = false,
  intro,
  children,
}) {
  useDocumentTitle(title ?? heading);
  useAuthIntro(intro);
  const channel = useContext(AuthIntroContext);
  const short = compact || Boolean(channel?.override);
  // A change of screen inside a view transition (AuthLink): its parts only rise.
  const arrivedInTransition = useArrivedInTransition();
  return (
    <div
      className={cn(
        short ? "lg:row-span-2" : "contents",
        arrivedInTransition && "wv-in-transition",
      )}
    >
      <div className="pb-32">
        <h1
          className="wv-stagger font-display text-page font-bold text-ink sm:text-title"
          style={step(1)}
        >
          {heading}
        </h1>
        {line && (
          <p
            className="wv-stagger mt-11 text-lg text-mut sm:mt-14"
            style={step(2)}
          >
            {line}
          </p>
        )}
      </div>
      <div className="wv-stagger" style={step(3)}>
        {children}
      </div>
      {footer && (
        <div className="wv-stagger" style={step(4)}>
          <Footer>{footer}</Footer>
        </div>
      )}
    </div>
  );
}

// The form side's place in the arrival stagger (round six): after "Back to home" (0),
// 40ms behind the brand side.
const step = (i) => ({ "--stagger": i, "--stagger-base": "40ms" });

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
