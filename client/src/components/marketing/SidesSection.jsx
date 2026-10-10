export function SidesSection() {
  return (
    <section
      className="sides s-sp"
      id="sides"
      aria-labelledby="sides-h"
      data-scene="pass"
    >
      <div className="wrap">
        <div className="head">
          <h2 id="sides-h" className="wipe" data-in="">
            Written for the writer, not the watcher.
          </h2>
          <p>
            The manager reads. Nobody watches. Here is each part of WeeklyView
            from both sides of the desk, the writer's first.
          </p>
        </div>
        <div className="ledger">
          <div className="lhead" aria-hidden="true">
            <span className="l">The writer's side</span>
            <span className="c">
              <span className="samp">SAMPLE DATA</span>
            </span>
            <span className="r">The manager's side</span>
          </div>
          <ol>
            <li className="lrow">
              <div className="w">
                <p>
                  <b>For the writer.</b> A few lines when the day ends: task,
                  type, what you did, hours. Pick yesterday's task or start a
                  new one.
                </p>
              </div>
              <div className="c">
                <h3>The daily update</h3>
                <div className="frag">
                  <div className="fr-row hd">
                    <span>Tue 15 Sep</span>
                    <span>7 h</span>
                  </div>
                  <div className="fr-row">
                    <b>Booking flow</b>
                    <span>4.5 h</span>
                  </div>
                  <div className="fr-row">
                    <b>Login timeout</b>
                    <span>2.5 h</span>
                  </div>
                  <p className="fr-blk">
                    Blocker: waiting on API keys from the client
                  </p>
                </div>
              </div>
              <div className="m">
                <p>
                  <b>For the manager.</b> Read as it lands. A blocker is counted
                  that evening, not discovered on Friday.
                </p>
              </div>
            </li>
            <li className="lrow">
              <div className="w">
                <p>
                  <b>For the writer.</b> Already written from your five days.
                  Give each task a status and a note, and submit.
                </p>
              </div>
              <div className="c">
                <h3>The weekly report</h3>
                <div className="frag">
                  <div className="fr-row hd">
                    <span>Week 38 report</span>
                    <span className="chip c-draft">Draft</span>
                  </div>
                  <div className="fr-row">
                    <b>Booking flow</b>
                    <span>In progress</span>
                  </div>
                  <div className="fr-row">
                    <b>Login timeout</b>
                    <span>Done</span>
                  </div>
                  <div className="fr-row">
                    <b>Code review</b>
                    <span>Done</span>
                  </div>
                </div>
              </div>
              <div className="m">
                <p>
                  <b>For the manager.</b> Everyone files the same structure, so
                  the week adds up and compares like with like.
                </p>
              </div>
            </li>
            <li className="lrow">
              <div className="w">
                <p>
                  <b>For the writer.</b> Ask for approval, or don't. A submitted
                  report counts as filed either way.
                </p>
              </div>
              <div className="c">
                <h3>Review</h3>
                <div className="frag">
                  <div className="fr-chips">
                    <span className="chip c-draft">Draft</span>
                    <span className="chip c-subm">Submitted</span>
                    <span className="chip c-corr">Needs correction</span>
                    <span className="chip c-appr">Approved</span>
                  </div>
                </div>
              </div>
              <div className="m">
                <p>
                  <b>For the manager.</b> Approve it, or send it back with a
                  comment. You can't edit a word, and you never review your own.
                </p>
              </div>
            </li>
            <li className="lrow">
              <div className="w">
                <p>
                  <b>For the writer.</b> Nothing is overwritten. If a report
                  comes back, your first version stays on file with the comment
                  it got.
                </p>
              </div>
              <div className="c">
                <h3>Every revision</h3>
                <div className="frag">
                  <div className="fr-row cur">
                    <b>rev 2, current</b>
                    <span>Fri 18:31</span>
                  </div>
                  <div className="fr-row">
                    <b>rev 1, sent back</b>
                    <span>Fri 18:05</span>
                  </div>
                  <p className="fr-cmt">
                    Nadia F.: Login timeout is marked Done, but Tuesday's tests
                    still fail.
                  </p>
                </div>
              </div>
              <div className="m">
                <p>
                  <b>For the manager.</b> Each correction is kept with its
                  submission time, so you can see what changed and why.
                </p>
              </div>
            </li>
            <li className="lrow">
              <div className="w">
                <p>
                  <b>For the writer.</b> There's no deadline, so nothing is ever
                  late, and nothing nags you.
                </p>
              </div>
              <div className="c">
                <h3>Not started</h3>
                <div className="frag">
                  <div className="fr-row">
                    <b>Dinesh K.</b>
                    <span className="chip c-none">Not started</span>
                  </div>
                </div>
              </div>
              <div className="m">
                <p>
                  <b>For the manager.</b> See who hasn't started without chasing
                  anyone. It's a fact, never a scold.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
