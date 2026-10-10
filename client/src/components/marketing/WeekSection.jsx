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
                <b>
                  Mon<span className="dt">14 Sep</span>
                </b>
                <span className="d-h">7.5 h</span>
                <span className="d-pt">Posted 17:36</span>
              </div>
              <div className="d-ctl">
                <span className="cc">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  No comments
                </span>
                <span className="sw">
                  <i></i>Open to team comments
                </span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>
                      Booking flow<small>Client A</small>
                    </b>
                    <span>5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c1"></i>Development
                  </span>
                  <span className="d-d">
                    Wired the booking form to the new API
                  </span>
                </li>
                <li>
                  <span className="d-t">
                    <b>
                      Login timeout<small>Client A</small>
                    </b>
                    <span>2.5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c2"></i>Testing
                  </span>
                  <span className="d-d">Reproduced it on Safari</span>
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
                <b>
                  Tue<span className="dt">15 Sep</span>
                </b>
                <span className="d-h">7 h</span>
                <span className="d-pt">Posted 17:42</span>
              </div>
              <div className="d-ctl">
                <span className="cc">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  2 comments
                </span>
                <span className="sw on">
                  <i></i>Open to team comments
                </span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>
                      Booking flow<small>Client A</small>
                    </b>
                    <span>4.5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c1"></i>Development
                  </span>
                  <span className="d-d">Date validation and error states</span>
                </li>
                <li>
                  <span className="d-t">
                    <b>
                      Login timeout<small>Client A</small>
                    </b>
                    <span>2.5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c2"></i>Testing
                  </span>
                  <span className="d-d">Wrote regression tests</span>
                </li>
              </ul>
              <div className="d-blk">
                <span className="lab">Blockers</span>
                <p className="bl">
                  <span className="chk"></span>
                  <span className="bt">
                    Waiting on API keys from the client
                  </span>
                  <em>Key</em>
                </p>
              </div>
              <div className="d-cmt">
                <span className="lab">Comments</span>
                <div className="cm">
                  <span className="avs">NF</span>
                  <b>Nadia F.</b>
                  <span className="rc">Manager</span>
                  <time>Tue 18:02</time>
                </div>
                <p>I’ve chased the client. Keys should land tomorrow.</p>
                <div className="rp">
                  <div className="cm">
                    <span className="avs">IJ</span>
                    <b>Imali J.</b>
                    <time>Tue 18:20</time>
                  </div>
                  <p>Thanks, that unblocks Wednesday.</p>
                </div>
              </div>
            </li>
            <li className="day">
              <span className="d-wait" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <div className="d-hd">
                <b>
                  Wed<span className="dt">16 Sep</span>
                </b>
                <span className="d-h">7.5 h</span>
                <span className="d-pt">Posted 17:51</span>
              </div>
              <div className="d-ctl">
                <span className="cc">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  No comments
                </span>
                <span className="sw">
                  <i></i>Open to team comments
                </span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>
                      Login timeout<small>Client A</small>
                    </b>
                    <span>3 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c1"></i>Development
                  </span>
                  <span className="d-d">Fixed the session refresh</span>
                </li>
                <li>
                  <span className="d-t">
                    <b>
                      Booking flow<small>Client A</small>
                    </b>
                    <span>4.5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c7"></i>Research &amp; study
                  </span>
                  <span className="d-d">Read the calendar API guide</span>
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
                <b>
                  Thu<span className="dt">17 Sep</span>
                </b>
                <span className="d-h">8 h</span>
                <span className="d-pt">Posted 17:38</span>
              </div>
              <div className="d-ctl">
                <span className="cc">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  No comments
                </span>
                <span className="sw">
                  <i></i>Open to team comments
                </span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>
                      Booking flow<small>Client A</small>
                    </b>
                    <span>4.5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c1"></i>Development
                  </span>
                  <span className="d-d">Mobile layout and styling</span>
                </li>
                <li>
                  <span className="d-t">
                    <b>
                      Code review<small>Client A</small>
                    </b>
                    <span>3.5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c5"></i>Review
                  </span>
                  <span className="d-d">Reviewed Tharindu’s pull request</span>
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
                <b>
                  Fri<span className="dt">18 Sep</span>
                </b>
                <span className="d-h">7.5 h</span>
                <span className="d-pt">Posted 17:30</span>
              </div>
              <div className="d-ctl">
                <span className="cc">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  No comments
                </span>
                <span className="sw">
                  <i></i>Open to team comments
                </span>
              </div>
              <ul className="d-lines">
                <li>
                  <span className="d-t">
                    <b>
                      Booking flow<small>Client A</small>
                    </b>
                    <span>5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c1"></i>Development
                  </span>
                  <span className="d-d">Saved-guest flow</span>
                </li>
                <li>
                  <span className="d-t">
                    <b>
                      Login timeout<small>Client A</small>
                    </b>
                    <span>2.5 h</span>
                  </span>
                  <span className="d-ty">
                    <i className="mk c2"></i>Testing
                  </span>
                  <span className="d-d">Re-ran the regression tests</span>
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
                  <span className="chip md c-draft">Draft</span>
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
                        <small>
                          <span className="ty">
                            <i className="mk c1"></i>Development
                          </span>
                          <span className="ty">
                            <i className="mk c7"></i>Research &amp; study
                          </span>
                        </small>
                      </td>
                      <td className="r">23.5 h</td>
                      <td className="r">
                        <span className="sel st">
                          <span className="s0" aria-hidden="true">
                            Set status
                          </span>
                          <span className="s1">In progress</span>
                          <span className="chev" aria-hidden="true"></span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Login timeout</b>
                        <small>
                          <span className="ty">
                            <i className="mk c2"></i>Testing
                          </span>
                          <span className="ty">
                            <i className="mk c1"></i>Development
                          </span>
                        </small>
                      </td>
                      <td className="r">10.5 h</td>
                      <td className="r">
                        <span className="sel st">
                          <span className="s0" aria-hidden="true">
                            Set status
                          </span>
                          <span className="s1">Done</span>
                          <span className="chev" aria-hidden="true"></span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Code review</b>
                        <small>
                          <span className="ty">
                            <i className="mk c5"></i>Review
                          </span>
                        </small>
                      </td>
                      <td className="r">3.5 h</td>
                      <td className="r">
                        <span className="sel st">
                          <span className="s0" aria-hidden="true">
                            Set status
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
