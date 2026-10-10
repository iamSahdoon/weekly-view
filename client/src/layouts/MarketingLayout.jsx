import { CtaPill } from "../components/marketing/CtaPill.jsx";

// The landing page's frame (brand §6.0; project_structure.md): the `.landing` root that
// scopes every landing rule, the skip link, the reading rail, the sticky nav and the
// footer. It sits outside the app's shell and ignores the theme toggle. `signupOpen`
// swaps the nav's action from the demo to "Create your account"
// (frontend_architecture.md §9.16).

export default function MarketingLayout({ rootRef, signupOpen, children }) {
  return (
    <div className="landing" ref={rootRef}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="rail" data-rail="" aria-hidden="true" />

      <header className="top" data-header="">
        <div className="wrap">
          <a className="mark" href="#top" aria-label="WeeklyView home">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              aria-hidden="true"
            >
              <path d="M7 4H4v16h3M17 4h3v16h-3" />
              <path
                d="M12 8v8"
                style={{ stroke: "var(--l-acc)" }}
                strokeWidth="2.6"
              />
            </svg>
            WeeklyView
          </a>
          <nav className="nl" aria-label="Sections">
            <a href="#week">The week</a>
            <a href="#desk">For managers</a>
            <a href="#sides">Both sides</a>
            <a href="#limits">Limits</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="acct">
            <a className="si" href="/signin">
              Sign in
            </a>
            {signupOpen ? (
              <CtaPill size="sm" href="/signup">
                Create your account
              </CtaPill>
            ) : (
              <CtaPill size="sm" href="/demo">
                See the live demo
              </CtaPill>
            )}
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer>
        <div className="wrap">
          <span>
            WeeklyView. Daily updates, one weekly report, one dashboard.
          </span>
          <span>
            Every name on this page belongs to a fictional sample team.{" "}
            <a href="/signin">Sign in</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
