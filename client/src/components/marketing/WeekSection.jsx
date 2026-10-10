export function WeekSection() {
  return (
    <section
      className="week s-deep"
      id="week"
      data-scene="pin"
      aria-labelledby="week-h"
    >
      <div className="wk-sticky">
        <div className="wrap wk-head">
          <h2 id="week-h" className="wipe" data-in="">
            Five days in. One report out.
          </h2>
          <div className="wk-intro">
            <p>
              Scroll through Imali J.'s week. Each day is one short update the
              team reads as it lands. On Friday, the five days become her
              report.
            </p>
            <div className="wk-meta">
              <span>
                <b>Imali J.</b>, team member, W38 · 14–18 Sep
              </span>
              <span className="samp">SAMPLE DATA</span>
            </div>
          </div>
        </div>
        <div className="wrap dr-row" aria-hidden="true">
          <div className="dayrail">
            <ol id="dayrail">
              <li className="on">Mon</li>
              <li>Tue</li>
              <li>Wed</li>
              <li>Thu</li>
              <li>Fri</li>
            </ol>
            <span className="dr-ind" id="dr-ind"></span>
            <span className="dr-track">
              <span className="dr-fill" id="dayfill"></span>
            </span>
            <span className="dr-rep">Report</span>
          </div>
        </div>
        <div className="wrap wk-stage" id="wk-stage">
          <ol className="track" id="track">
            <li className="day">
              <span className="d-wait" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <div className="d-hd">
                <b>Mon 14 Sep</b>
                <span className="d-h">7.5 h</span>
                <span className="d-pt">Posted 17:36</span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>Booking flow</b>
                    <span>5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Development</span>Wired the booking
                    form to the new API
                  </span>
                </li>
                <li>
                  <span className="d-t">
                    <b>Login timeout</b>
                    <span>2.5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Testing</span>Reproduced it on Safari
                  </span>
                </li>
              </ul>
            </li>
            <li className="day">
              <span className="d-wait" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <div className="d-hd">
                <b>Tue 15 Sep</b>
                <span className="d-h">7 h</span>
                <span className="d-pt">Posted 17:42</span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>Booking flow</b>
                    <span>4.5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Development</span>Date validation and
                    error states
                  </span>
                </li>
                <li>
                  <span className="d-t">
                    <b>Login timeout</b>
                    <span>2.5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Testing</span>Wrote regression tests
                  </span>
                </li>
              </ul>
              <p className="d-blk">
                <b>Blocker:</b> waiting on API keys from the client
              </p>
              <p className="d-cmt">
                <b>
                  Nadia F. <span>18:02</span>
                </b>
                I've chased the client. Keys should land tomorrow.
              </p>
            </li>
            <li className="day">
              <span className="d-wait" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <div className="d-hd">
                <b>Wed 16 Sep</b>
                <span className="d-h">7.5 h</span>
                <span className="d-pt">Posted 17:51</span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>Login timeout</b>
                    <span>3 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Development</span>Fixed the session
                    refresh
                  </span>
                </li>
                <li>
                  <span className="d-t">
                    <b>Booking flow</b>
                    <span>4.5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Research &amp; study</span>Read the
                    calendar API guide
                  </span>
                </li>
              </ul>
            </li>
            <li className="day">
              <span className="d-wait" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <div className="d-hd">
                <b>Thu 17 Sep</b>
                <span className="d-h">8 h</span>
                <span className="d-pt">Posted 17:38</span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>Booking flow</b>
                    <span>4.5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Development</span>Mobile layout and
                    styling
                  </span>
                </li>
                <li>
                  <span className="d-t">
                    <b>Code review</b>
                    <span>3.5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Review</span>Reviewed Tharindu's pull
                    request
                  </span>
                </li>
              </ul>
            </li>
            <li className="day">
              <span className="d-wait" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <div className="d-hd">
                <b>Fri 18 Sep</b>
                <span className="d-h">7.5 h</span>
                <span className="d-pt">Posted 17:30</span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>Booking flow</b>
                    <span>5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Development</span>Saved-guest flow
                  </span>
                </li>
                <li>
                  <span className="d-t">
                    <b>Login timeout</b>
                    <span>2.5 h</span>
                  </span>
                  <span className="d-d">
                    <span className="tt">Testing</span>Re-ran the regression
                    tests
                  </span>
                </li>
              </ul>
              <p className="d-rep">
                The week 38 report is built from these five days.
              </p>
            </li>
          </ol>
          <div className="report" id="report">
            <div className="rframe">
              <div className="rin">
                <div className="rtop">
                  <b>Week 38 report</b>
                  <span className="chip c-draft">Draft</span>
                </div>
                <div className="rmeta">
                  <span>Imali J. · W38 · 14–18 Sep</span>
                  <span className="samp-u">SAMPLE DATA</span>
                </div>
                <div className="rstat">
                  <div>
                    <span>Built from</span>
                    <b>5 days</b>
                  </div>
                  <div>
                    <span>Total</span>
                    <b>37.5 h</b>
                  </div>
                  <div>
                    <span>Tasks</span>
                    <b>3</b>
                  </div>
                </div>
                <table className="rtbl">
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col" className="r">
                        Hours
                      </th>
                      <th scope="col" className="r">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <b>Booking flow</b>
                        <small>Development, Research &amp; study</small>
                      </td>
                      <td className="r">23.5 h</td>
                      <td className="r">
                        <span className="sel st">
                          <span className="s0" aria-hidden="true">
                            Set a status
                          </span>
                          <span className="s1">In progress</span>
                          <span className="chev" aria-hidden="true"></span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Login timeout</b>
                        <small>Testing, Development</small>
                      </td>
                      <td className="r">10.5 h</td>
                      <td className="r">
                        <span className="sel st">
                          <span className="s0" aria-hidden="true">
                            Set a status
                          </span>
                          <span className="s1">Done</span>
                          <span className="chev" aria-hidden="true"></span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Code review</b>
                        <small>Review</small>
                      </td>
                      <td className="r">3.5 h</td>
                      <td className="r">
                        <span className="sel st">
                          <span className="s0" aria-hidden="true">
                            Set a status
                          </span>
                          <span className="s1">Done</span>
                          <span className="chev" aria-hidden="true"></span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="rkey">
                  <span className="lab">Key blocker</span>
                  <div className="ukey">
                    <span>Tue</span>
                    <span>Waiting on API keys from the client</span>
                    <em>Key</em>
                  </div>
                </div>
                <div className="rfoot">
                  <span className="ucheck">
                    <i></i>Ask for approval
                  </span>
                  <span className="ubtn">Submit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
