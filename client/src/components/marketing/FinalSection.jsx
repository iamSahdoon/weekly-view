import { CtaPill } from "./CtaPill.jsx";
import { Words } from "./Words.jsx";

export function FinalSection({ signupOpen }) {
  return (
    <section className="final s-deep" aria-labelledby="fin-h">
      <svg
        className="farc"
        viewBox="0 0 1300 560"
        aria-hidden="true"
        data-in=""
      >
        <path
          pathLength="1"
          data-draw=""
          d="M24 556C150 -40 1150 -40 1276 556"
        />
      </svg>
      <div className="wrap">
        <h2 id="fin-h" data-split="">
          <Words text="Write the day. Read the week." />
        </h2>
        <p data-reveal="">
          One short note a day, and Friday&rsquo;s report builds itself. See it
          in the demo: no sign-up, and nothing is saved.
        </p>
        <div className="fin-acts">
          {signupOpen ? (
            <>
              <CtaPill size="xl" href="/signup" data-magnetic="0.2">
                Create your account
              </CtaPill>
              <CtaPill size="xl" href="/demo" variant="ghost">
                See the live demo
              </CtaPill>
            </>
          ) : (
            <CtaPill size="xl" href="/demo" data-magnetic="0.2">
              See the live demo
            </CtaPill>
          )}
        </div>
      </div>
    </section>
  );
}
