import { Link, useNavigate } from "react-router-dom";
import { LandingPage, SignInPage, SignUpPage } from "./pages.js";

// A link between the landing page and the auth screens (owner decision, auth pages round
// six, 2026-10-17; frontend_architecture.md §9.16): client-side, inside a view transition
// (base.css styles it; reduced motion makes it instant). The page it opens is loaded before
// the navigation starts, so the transition never captures a fallback or the boot splash;
// a modified click (new tab, new window) is left to the browser. In a browser without
// view transitions it is a plain client-side navigation, and the page's own entrance plays.

const PAGES = {
  "/": LandingPage,
  "/signin": SignInPage,
  "/signup": SignUpPage,
};

export function TransitionLink({ to, onClick, ...props }) {
  const navigate = useNavigate();
  const page = PAGES[to];
  return (
    <Link
      to={to}
      viewTransition
      onClick={(event) => {
        onClick?.(event);
        if (
          !page ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        page
          .preload()
          .catch(() => {})
          .then(() => navigate(to, { viewTransition: true }));
      }}
      {...props}
    />
  );
}
