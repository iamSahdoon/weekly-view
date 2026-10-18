import { Route as RouteIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { cn } from "../../lib/cn.js";

// Design §3.14: a 36px bar above the top bar, full width, in the dark-band surface.
// It is the theme-independent --d-panel rather than --ink: --ink turns near-white in
// the dark theme, and --d-text on it would vanish. SAMPLE DATA, who you are with
// `Switch` (back to the chooser — the sample data stays as it is), and on the right
// `Start over` (a fresh load, so a fresh store) and the way out to the real app.
// The demo answers "bootstrap closed", so the way out is always `Sign in`.
// `Tour` opens the guided tour's panel (owner request, 2026-10-17): it lives in the bar so
// it never covers a page's own actions. It only sends a DOM event; the tour is a chunk of
// its own that this bundle never imports.

// demo/tour/tourBus.js listens for it.
const TOUR_EVENT = "weeklyview:tour";

export const DEMO_BAR_HEIGHT = 36;

const ROLE = { member: "Member", manager: "Manager", admin: "Admin" };

const TEXT_BUTTON = cn(
  "touch-target inline-flex h-[24px] shrink-0 items-center px-8 text-caption max-xs:px-6 font-medium whitespace-nowrap no-underline",
  "transition-colors duration-[120ms] ease-linear",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-d-text",
);

export function DemoBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const switchPerspective = () => {
    // The store keeps what the visitor did; the chooser is the signed-out "/".
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <div
      role="region"
      aria-label="Demo"
      data-tour="demo-bar"
      style={{ height: DEMO_BAR_HEIGHT }}
      className="sticky top-0 z-[45] flex items-center gap-11 border-b border-d-line bg-d-panel px-20 text-caption text-d-body max-xs:gap-4 max-xs:px-6 max-md:px-11 print:hidden"
    >
      <span className="shrink-0 border border-dashed border-d-mut px-6 py-2 font-mono text-micro leading-none font-medium text-d-text">
        SAMPLE DATA
      </span>
      <p className="min-w-0 truncate" data-tour="demo-who">
        <span className="max-sm:hidden">Demo · you&rsquo;re </span>
        <span className="font-medium text-d-text">{user.name}</span>
        <span className="max-sm:hidden">, {ROLE[user.role]}</span>
      </p>
      <button
        type="button"
        onClick={switchPerspective}
        className={cn(
          TEXT_BUTTON,
          "-ml-4 text-d-text underline underline-offset-[3px] hover:bg-d-hover max-xs:-ml-2 max-xs:px-2",
        )}
      >
        Switch
      </button>
      <span className="ml-auto" />
      <button
        type="button"
        aria-haspopup="dialog"
        data-tour="tour-launcher"
        onClick={() =>
          window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: "panel" }))
        }
        className={cn(
          TEXT_BUTTON,
          "gap-4 text-d-text hover:bg-d-hover max-xs:px-2",
        )}
      >
        <RouteIcon
          aria-hidden="true"
          className="size-[13px]"
          strokeWidth={1.75}
        />
        {/* On a phone the icon alone, so the bar still fits who you are. */}
        <span className="max-xs:sr-only">Tour</span>
      </button>
      <button
        type="button"
        onClick={() => window.location.assign("/demo")}
        className={cn(
          TEXT_BUTTON,
          "text-d-body hover:bg-d-hover hover:text-d-text max-xs:px-2",
        )}
      >
        Start over
      </button>
      <a
        href="/signin"
        className={cn(TEXT_BUTTON, "bg-d-text text-d-panel hover:bg-on-acc")}
      >
        Sign in
      </a>
    </div>
  );
}
