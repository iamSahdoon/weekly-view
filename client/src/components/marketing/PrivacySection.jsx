// "Private where it matters" (owner decision, landing revamp; replaces the Limits
// section): three plain benefits, the privacy promise, and the full rules behind a
// "See exactly who sees what" disclosure. Every claim matches requirements §4 and §2.1.

export function PrivacySection() {
  return (
    <section className="privacy s-deep" id="private" aria-labelledby="pv-h">
      <div className="wrap">
        <div className="pv-head">
          <p className="eyebrow">Privacy</p>
          <h2 id="pv-h" className="wipe" data-in="">
            Private where it matters.
          </h2>
          <p>
            Write honestly. Each part of the week reaches only the people it is
            for.
          </p>
        </div>
        <ul className="pvs">
          <li className="pv" data-reveal="" style={{ "--l-i": 0 }}>
            <span className="lic" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path pathLength="1" data-draw="" d="M8 4h11l6 6v18H8z" />
                <path
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 1 }}
                  d="M19 4v6h6"
                />
                <path
                  className="ac"
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 3 }}
                  d="M12.5 19.5h8v6h-8z"
                />
                <path
                  className="ac"
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 4 }}
                  d="M14 19.5v-2a2.5 2.5 0 0 1 5 0v2"
                />
              </svg>
            </span>
            <h3>Your weekly report goes to managers only.</h3>
            <p>Teammates read your daily notes, never your weekly report.</p>
          </li>
          <li className="pv" data-reveal="" style={{ "--l-i": 1 }}>
            <span className="lic" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path
                  pathLength="1"
                  data-draw=""
                  d="M5 6.5h22v14H14l-6 5v-5H5z"
                />
                <path
                  className="ac"
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 2 }}
                  d="M10 11.5h12"
                />
                <path
                  className="ac"
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 3 }}
                  d="M10 15.5h7"
                />
              </svg>
            </span>
            <h3>Managers comment. Your words stay yours.</h3>
            <p>
              They can approve a report or send it back, but never rewrite it.
            </p>
          </li>
          <li className="pv" data-reveal="" style={{ "--l-i": 2 }}>
            <span className="lic" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path
                  pathLength="1"
                  data-draw=""
                  d="M5 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0"
                />
                <path
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 1 }}
                  d="M2.5 28.5c0-4 2.9-6.5 6.5-6.5s6.5 2.5 6.5 6.5"
                />
                <path
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 2 }}
                  d="M19 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0"
                />
                <path
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 3 }}
                  d="M16.5 28.5c0-4 2.9-6.5 6.5-6.5s6.5 2.5 6.5 6.5"
                />
                <path
                  className="ac"
                  pathLength="1"
                  data-draw=""
                  style={{ "--l-i": 4 }}
                  d="M10 7h11.5M18.5 4l3 3-3 3"
                />
              </svg>
            </span>
            <h3>Nobody approves their own work.</h3>
            <p>
              A manager’s own report is reviewed by another manager or an admin.
            </p>
          </li>
        </ul>
        <p className="notrack" data-reveal="">
          No activity tracking, no screenshots, no idle timers.{" "}
          <span>Only what people choose to write.</span>
        </p>
        <details className="whosees">
          <summary>
            See exactly who sees what
            <span className="pm" aria-hidden="true"></span>
          </summary>
          <div className="mtab">
            <table className="who" aria-label="Who sees what">
              <thead>
                <tr>
                  <th scope="col">What</th>
                  <th scope="col">The author</th>
                  <th scope="col">A teammate</th>
                  <th scope="col">A manager</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Read daily updates</th>
                  <td className="y">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        pathLength="1"
                        data-draw=""
                        d="M2.5 8.5l3.5 3.5 7.5-8"
                      />
                    </svg>
                    Yes
                  </td>
                  <td className="y">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        pathLength="1"
                        data-draw=""
                        d="M2.5 8.5l3.5 3.5 7.5-8"
                      />
                    </svg>
                    Yes
                  </td>
                  <td className="y">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        pathLength="1"
                        data-draw=""
                        d="M2.5 8.5l3.5 3.5 7.5-8"
                      />
                    </svg>
                    Yes
                  </td>
                </tr>
                <tr>
                  <th scope="row">Comment on a daily update</th>
                  <td className="y">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        pathLength="1"
                        data-draw=""
                        d="M2.5 8.5l3.5 3.5 7.5-8"
                      />
                    </svg>
                    Yes
                  </td>
                  <td>Only if it's opened to the team</td>
                  <td className="y">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        pathLength="1"
                        data-draw=""
                        d="M2.5 8.5l3.5 3.5 7.5-8"
                      />
                    </svg>
                    Yes
                  </td>
                </tr>
                <tr>
                  <th scope="row">Read the weekly report</th>
                  <td className="y">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        pathLength="1"
                        data-draw=""
                        d="M2.5 8.5l3.5 3.5 7.5-8"
                      />
                    </svg>
                    Yes
                  </td>
                  <td className="n">No</td>
                  <td>Once it's submitted</td>
                </tr>
                <tr>
                  <th scope="row">Edit the weekly report</th>
                  <td>While it's Draft or Needs correction</td>
                  <td className="n">No</td>
                  <td className="n">No</td>
                </tr>
                <tr>
                  <th scope="row">Approve or send it back</th>
                  <td className="n">No</td>
                  <td className="n">No</td>
                  <td>Yes, except their own</td>
                </tr>
              </tbody>
            </table>
            <div className="mcards">
              <div className="mcard">
                <h4>Daily updates</h4>
                <dl>
                  <dt>The author</dt>
                  <dd>Reads and writes them</dd>
                  <dt>A teammate</dt>
                  <dd>
                    Reads them; comments if the author opens it to the team
                  </dd>
                  <dt>A manager</dt>
                  <dd>Reads them and comments</dd>
                </dl>
              </div>
              <div className="mcard">
                <h4>The weekly report</h4>
                <dl>
                  <dt>The author</dt>
                  <dd>Edits it while it's Draft or Needs correction</dd>
                  <dt>A teammate</dt>
                  <dd>Can't read it</dd>
                  <dt>A manager</dt>
                  <dd>Reads it once submitted; can't edit it</dd>
                </dl>
              </div>
              <div className="mcard">
                <h4>Approve or send back</h4>
                <dl>
                  <dt>The author</dt>
                  <dd>Never their own</dd>
                  <dt>A teammate</dt>
                  <dd>No</dd>
                  <dt>A manager</dt>
                  <dd>Yes, except their own</dd>
                </dl>
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
