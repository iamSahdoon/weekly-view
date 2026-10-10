import { CtaPill } from "../components/marketing/CtaPill.jsx";

// The landing page's frame (brand §6.0; project_structure.md): the `.landing` root that
// scopes every landing rule, the skip link, the reading rail, the sticky nav and the
// footer (a week of squares, the links, the wordmark). The landing page's wordmark is text
// only; the bracketed-bar glyph stays in the app (brand §6.0 rule 12). It sits outside the
// app's shell and ignores the theme toggle. `signupOpen`
// swaps the nav's action from the demo to "Create your account"
// (frontend_architecture.md §9.16).

// The footer's week (owner decision, landing polish): the dashboard's squares in the landing's
// colours. It fills in Monday to Friday when it comes into view (useLandingMotion).
const WEEK = [
  ["Mon", "p", "Monday: posted"],
  ["Tue", "p", "Tuesday: posted"],
  ["Wed", "m", "Wednesday: missing"],
  ["Thu", "p", "Thursday: posted"],
  ["Fri", "h", "Friday: holiday"],
];
const YEAR = new Date().getFullYear();

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
            WeeklyView
          </a>
          <nav className="nl" aria-label="Sections">
            <a href="#prob">Why it helps</a>
            <a href="#week">For the team</a>
            <a href="#desk">For managers</a>
            <a href="#private">Privacy</a>
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

      <footer className="foot" aria-label="WeeklyView">
        <div className="wrap">
          <div className="ft-top">
            <div className="fw" data-week="">
              <p className="ft-h">One square a day</p>
              <ol
                className="fw-days"
                aria-label="A week of daily updates, on sample data"
              >
                {WEEK.map(([day, state, said]) => (
                  <li className="fw-day" key={day}>
                    <span className="fw-d">{day}</span>
                    <span className="fw-sq">
                      <i className={state}></i>
                    </span>
                    <span className="vh">{said}</span>
                  </li>
                ))}
              </ol>
              <ul className="fw-leg" aria-hidden="true">
                <li data-s="p">
                  <i className="p"></i>Posted
                </li>
                <li data-s="m">
                  <i className="m"></i>Missing
                </li>
                <li data-s="h">
                  <i className="h"></i>Holiday
                </li>
              </ul>
            </div>
            <nav className="ft-cols" aria-label="Footer">
              <div>
                <p className="ft-h" id="ft-product">
                  Product
                </p>
                <ul aria-labelledby="ft-product">
                  <li>
                    <a href="#week">The week</a>
                  </li>
                  <li>
                    <a href="#desk">For managers</a>
                  </li>
                  <li>
                    <a href="#private">Privacy</a>
                  </li>
                  <li>
                    <a href="#faq">FAQ</a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="ft-h" id="ft-start">
                  Get started
                </p>
                <ul aria-labelledby="ft-start">
                  <li>
                    <a href="/demo">Live demo</a>
                  </li>
                  <li>
                    <a href="/signin">Sign in</a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
          <p className="ft-mark" data-wordmark="" aria-hidden="true">
            <span>WeeklyView</span>
          </p>
          <div className="ft-bot">
            <span>&copy; {YEAR} WeeklyView</span>
            <span className="ft-promise">No activity tracking. Ever.</span>
            <span>
              Every name on this page belongs to a fictional sample team.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
