// The FAQ, in plain language (owner decision, landing revamp). Answers are the one place
// the page may run past ~20 words (brand §8).

export function QuestionsSection({ signupOpen }) {
  return (
    <section className="qs s-deep" id="faq" aria-labelledby="q-h">
      <div className="wrap">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 className="q wipe" id="q-h" data-in="">
            Asked before rolling it out.
          </h2>
        </div>
        <div className="faq">
          <details>
            <summary>
              Is this employee monitoring?
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p>
              No. Nothing tracks activity, screens or idle time. People write a
              few lines a day in their own words. Managers can comment, but
              never edit.
            </p>
          </details>
          <details>
            <summary>
              Who can read what I write?
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p>
              Your team reads your daily notes. Your weekly report goes to
              managers only. Teammates can comment on a day only if you open it
              to them.
            </p>
          </details>
          <details>
            <summary>
              How long does the weekly report take?
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p>
              A few minutes. Your five days fill it in. You give each task a
              status, pick the key blocker if there is one, and submit.
            </p>
          </details>
          <details>
            <summary>
              What if my manager sends a report back?
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p>
              It moves to Needs correction with their comment. You fix it and
              submit again. The version that was sent back is kept, not
              replaced.
            </p>
          </details>
          <details>
            <summary>
              Do we need Slack, email or another tool?
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p>
              No. WeeklyView is a web app on its own, with no email and no
              notifications. Anything new to you carries a small “new” marker
              until you open it.
            </p>
          </details>
          <details>
            <summary>
              How does a team start?
              <span className="pm" aria-hidden="true"></span>
            </summary>
            {signupOpen ? (
              <p>
                Each team runs its own copy. On a fresh one, the first person to
                sign up becomes the owner and invites the rest with a link. This
                copy has no account yet, so you can create the first.
              </p>
            ) : (
              <p>
                Each team runs its own copy. On a fresh one, the first person to
                sign up becomes the owner and invites the rest with a link. This
                copy is the demo, so signup here is closed.
              </p>
            )}
          </details>
        </div>
      </div>
    </section>
  );
}
