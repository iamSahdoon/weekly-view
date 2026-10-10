export function LimitsSection() {
  return (
    <section className="limits s-deep" id="limits" aria-labelledby="lim-h">
      <div className="wrap">
        <h2 id="lim-h" className="wipe" data-in="">
          The limits are in the product, not left to good manners.
        </h2>
        <ul className="lims">
          <li>
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
            <h3>Teammates can't read your weekly report.</h3>
            <p>
              They read your daily updates. The report goes to managers only,
              and the server checks that on every request, so typing its URL
              gets a teammate nothing.
            </p>
          </li>
          <li>
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
            <h3>Managers comment. They can't edit a word.</h3>
            <p>
              They approve a report, or send it back with a comment. The words
              stay the author's, in every revision.
            </p>
          </li>
          <li>
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
            <h3>Nobody reviews their own report.</h3>
            <p>
              Managers review each other too. The server refuses an approval or
              a send-back on your own week.
            </p>
          </li>
        </ul>
        <div className="mx">
          <div>
            <h3 id="mx-h">Who can do what</h3>
            <p className="note">
              WeeklyView checks every action, so people can only do what their
              role allows.
            </p>
            <div className="srv" id="srv">
              <div className="srv-node" id="srv-node">
                <span className="srv-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="4" y="3.5" width="16" height="7" rx="1.5" />
                    <rect x="4" y="13.5" width="16" height="7" rx="1.5" />
                    <path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" />
                  </svg>
                </span>
                <span>
                  <b>WeeklyView checks</b>
                  <small>who you are and what you&rsquo;re allowed to do</small>
                </span>
              </div>
              <ol className="srv-q">
                <li>
                  <span className="q-t">
                    <b>Tharindu</b> (teammate) reads Imali&rsquo;s daily updates
                  </span>
                  <span className="vd ok">Allowed</span>
                </li>
                <li>
                  <span className="q-t">
                    <b>Tharindu</b> (teammate) tries to open Imali&rsquo;s
                    weekly report
                  </span>
                  <span className="vd no">Not allowed: managers only</span>
                </li>
                <li>
                  <span className="q-t">
                    <b>Nadia</b> (manager) comments on Imali&rsquo;s weekly
                    report
                  </span>
                  <span className="vd ok">Allowed</span>
                </li>
                <li>
                  <span className="q-t">
                    <b>Nadia</b> (manager) tries to change Imali&rsquo;s report
                  </span>
                  <span className="vd no">Not allowed: comments only</span>
                </li>
                <li>
                  <span className="q-t">
                    <b>Nadia</b> (manager) tries to approve her own report
                  </span>
                  <span className="vd no">
                    Not allowed: no one approves their own
                  </span>
                </li>
              </ol>
              <span className="srv-dot" id="srv-dot" aria-hidden="true"></span>
              <p className="vh">
                Examples of what WeeklyView allows and what it refuses.
              </p>
            </div>
          </div>
          <div className="mtab">
            <table className="who" aria-labelledby="mx-h">
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
        </div>
        <p className="notrack" data-reveal="">
          No activity tracking, no screenshots, no idle timers.{" "}
          <span>Only what people choose to write.</span>
        </p>
      </div>
    </section>
  );
}
