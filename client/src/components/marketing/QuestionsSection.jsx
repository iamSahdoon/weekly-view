export function QuestionsSection({ signupOpen }) {
  return (
    <section className="qs s-sp" id="faq" aria-labelledby="q-h">
      <div className="wrap">
        <aside className="honest" aria-labelledby="new-h">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <path pathLength="1" data-draw="" d="M22 39V21" />
            <path
              pathLength="1"
              data-draw=""
              style={{ "--l-i": 2 }}
              d="M22 27c-8.5 0-13-4.5-13-13 8.5 0 13 4.5 13 13z"
            />
            <path
              pathLength="1"
              data-draw=""
              style={{ "--l-i": 3 }}
              d="M22 22c0-7.5 4-11.5 11.5-11.5 0 7.5-4 11.5-11.5 11.5z"
            />
            <path
              pathLength="1"
              data-draw=""
              style={{ "--l-i": 4 }}
              d="M13 39h18"
            />
          </svg>
          <h2 id="new-h">New, and saying so.</h2>
          <p>
            WeeklyView is new. There are no customers to quote yet, so the proof
            is the demo. Everyone on this page belongs to a fictional sample
            team.
          </p>
          <a href="/demo">See the live demo</a>
        </aside>
        <div>
          <h2 className="q wipe" id="q-h" data-in="">
            Asked before rolling it out.
          </h2>
          <div className="faq">
            <details>
              <summary>
                Is this employee monitoring?
                <span className="pm" aria-hidden="true"></span>
              </summary>
              <p>
                No. Nothing tracks activity, screens or idle time. People write
                a few lines each working day and one report a week, in their own
                words. A manager can comment, approve or send a report back.
                They can't edit a word of it.
              </p>
            </details>
            <details>
              <summary>
                What can my teammates see?
                <span className="pm" aria-hidden="true"></span>
              </summary>
              <p>
                Your daily updates, and the comments on them. Your weekly report
                goes to managers only, and that's checked on the server for
                every request. Teammates can comment on an update only if you
                open it to them.
              </p>
            </details>
            <details>
              <summary>
                How long does the weekly report take?
                <span className="pm" aria-hidden="true"></span>
              </summary>
              <p>
                The days write most of it. On Friday you give each task a status
                and a note, pick the key blocker if there is one, and submit.
                For a normal week that's a few minutes.
              </p>
            </details>
            <details>
              <summary>
                What happens when a report is sent back?
                <span className="pm" aria-hidden="true"></span>
              </summary>
              <p>
                It moves to Needs correction and reopens for its author, with
                the manager's comment attached. The version that was sent back
                is filed, not replaced.
              </p>
            </details>
            <details>
              <summary>
                Do we need Slack, email or another tool?
                <span className="pm" aria-hidden="true"></span>
              </summary>
              <p>
                No. WeeklyView is a standalone web app with no email, no push
                and no bell. Anything you haven't seen yet carries a small "new"
                marker until you open it.
              </p>
            </details>
            <details>
              <summary>
                How far along is it, and how does a team start?
                <span className="pm" aria-hidden="true"></span>
              </summary>
              {signupOpen ? (
                <p>
                  It's new. Each team runs its own installation: on a fresh one,
                  the first person to sign up becomes the owner and invites
                  everyone else with a link. This copy has no account yet, so
                  you can create the first.
                </p>
              ) : (
                <p>
                  It's new. Each team runs its own installation: on a fresh one,
                  the first person to sign up becomes the owner and invites
                  everyone else with a link. This copy is the demo, so signup
                  here is closed.
                </p>
              )}
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
