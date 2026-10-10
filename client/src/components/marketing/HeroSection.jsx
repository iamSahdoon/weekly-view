import { CtaPill } from "./CtaPill.jsx";
import { Words } from "./Words.jsx";

export function HeroSection({ signupOpen }) {
  return (
    <section className="hero s-sp" id="top" aria-labelledby="h1">
      <div className="wrap hgrid">
        <div className="hcopy">
          <h1 id="h1" data-split="" style={{ "--l-d": "80ms" }}>
            <Words text="One update." />{" "}
            <em>
              <Words text="Both sides of the desk." from={2} />
            </em>
          </h1>
          <p className="sub">
            Each person posts a few lines when their day ends. Their manager
            reads the same lines on one dashboard, and on Friday they become the
            weekly report.
          </p>
          <div className="acts">
            {signupOpen ? (
              <>
                <CtaPill href="/signup">Create your account</CtaPill>
                <CtaPill href="/demo" variant="ghost">
                  See the live demo
                </CtaPill>
                <span className="micro">
                  Set up your first week in minutes. No sign-up to explore the
                  demo.
                </span>
              </>
            ) : (
              <>
                <CtaPill href="/demo">See the live demo</CtaPill>
                <span className="micro">
                  No sign-up. Everything works, nothing is saved.
                </span>
              </>
            )}
          </div>
        </div>
        <div className="hvis">
          <div
            className="comp"
            id="comp"
            data-reveal="fade"
            style={{ "--l-d": "150ms" }}
          >
            <div
              className="stage sent landed"
              id="stage"
              role="img"
              aria-label="A laptop on a desk shows the team dashboard for Tuesday 15 September, with a phone in front of it. On the phone, Imali J. adds the blocker Waiting on API keys from the client to her update and posts it. The update crosses to the dashboard: open blockers go from 2 to 3, posted today from 5 to 6 of 8, and her row now shows Tuesday's update and the blocker. Sample data."
            >
              <span className="desk-edge"></span>
              <div className="lap">
                <div className="shell">
                  <div className="lscreen">
                    <div className="lside">
                      <span className="lmk">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M7 4H4v16h3M17 4h3v16h-3" />
                          <path
                            d="M12 8v8"
                            style={{ stroke: "var(--l-u-acc)" }}
                            strokeWidth="2.8"
                          />
                        </svg>
                        WeeklyView
                      </span>
                      <ul className="lnav">
                        <li>
                          Review desk<span className="ct">2</span>
                        </li>
                        <li className="on">Team dashboard</li>
                        <li>People</li>
                        <li>Projects</li>
                        <li>This week</li>
                        <li>My reports</li>
                        <li>Team updates</li>
                      </ul>
                      <span className="lme">
                        <b>Nadia F.</b>Manager
                      </span>
                    </div>
                    <div className="lmain">
                      <div className="ltop">
                        <b>Team dashboard</b>
                        <span>W38 · Tue 15 Sep</span>
                        <span className="samp-u">SAMPLE DATA</span>
                      </div>
                      <div className="lmet">
                        <div className="mc">
                          <span>Filed this week</span>
                          <b className="tn-acc">
                            2<small> / 8</small>
                          </b>
                        </div>
                        <div className="mc">
                          <span>Compliance</span>
                          <b className="tn-ok">25%</b>
                        </div>
                        <div className="mc">
                          <span>Needs correction</span>
                          <b className="tn-corr">1</b>
                        </div>
                        <div className="mc" id="mc-blk">
                          <span>Open blockers</span>
                          <b className="tn-warn">
                            <span className="roll" id="m-blk">
                              <span className="od">2</span>
                              <span className="nw">3</span>
                            </span>
                          </b>
                        </div>
                      </div>
                      <table className="ltbl">
                        <thead>
                          <tr>
                            <th>Person</th>
                            <th>Updates</th>
                            <th className="r">Hours</th>
                            <th>Blocker</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="nm">Nadia F.</td>
                            <td>
                              <span className="ups">
                                <i className="p"></i>
                                <i className="p"></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            </td>
                            <td className="r">15.5</td>
                            <td>
                              <span className="dash">–</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="nm">Ruwan P.</td>
                            <td>
                              <span className="ups">
                                <i className="p"></i>
                                <i className="p"></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            </td>
                            <td className="r">16.5</td>
                            <td>
                              <span className="chip c-corr">Tue</span>
                            </td>
                          </tr>
                          <tr id="r-imali">
                            <td className="nm">Imali J.</td>
                            <td>
                              <span className="ups">
                                <i className="p"></i>
                                <i className="t"></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            </td>
                            <td className="r" id="r-hrs">
                              14.5
                            </td>
                            <td>
                              <span className="bk">
                                <span className="dash">–</span>
                                <span className="chip c-corr">Tue</span>
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="nm">Tharindu S.</td>
                            <td>
                              <span className="ups">
                                <i className="p"></i>
                                <i className="p"></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            </td>
                            <td className="r">16</td>
                            <td>
                              <span className="dash">–</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="nm">Ayesha C.</td>
                            <td>
                              <span className="ups">
                                <i className="p"></i>
                                <i className="d"></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            </td>
                            <td className="r">7.5</td>
                            <td>
                              <span className="chip c-corr">Mon</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="nm">Dinesh K.</td>
                            <td>
                              <span className="ups">
                                <i className="m"></i>
                                <i className="d"></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            </td>
                            <td className="r">–</td>
                            <td>
                              <span className="dash">–</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="nm">Malith W.</td>
                            <td>
                              <span className="ups">
                                <i className="p"></i>
                                <i className="p"></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            </td>
                            <td className="r">15.5</td>
                            <td>
                              <span className="dash">–</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="nm">Sanduni B.</td>
                            <td>
                              <span className="ups">
                                <i className="p"></i>
                                <i className="p"></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            </td>
                            <td className="r">14.5</td>
                            <td>
                              <span className="dash">–</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <ul
                        className="lleg"
                        aria-label="What the update squares mean"
                      >
                        <li>
                          <span className="ups">
                            <i className="p"></i>
                          </span>
                          Posted
                        </li>
                        <li>
                          <span className="ups">
                            <i className="m"></i>
                          </span>
                          Missing
                        </li>
                        <li>
                          <span className="ups">
                            <i className="d"></i>
                          </span>
                          Not posted yet today
                        </li>
                        <li>
                          <span className="ups">
                            <i className="l"></i>
                          </span>
                          On leave
                        </li>
                        <li>
                          <span className="ups">
                            <i className="h"></i>
                          </span>
                          Holiday
                        </li>
                        <li>
                          <span className="ups">
                            <i className=""></i>
                          </span>
                          Later this week
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="lbase"></div>
              </div>
              <div className="ph">
                <div className="phone">
                  <div className="screen">
                    <div className="sbar">
                      <span>17:42</span>
                      <i></i>
                      <span>5G</span>
                    </div>
                    <div className="ubar">
                      <span className="mb" aria-hidden="true">
                        <i></i>
                        <i></i>
                        <i></i>
                      </span>
                      <b>This week</b>
                      <span className="samp-u">SAMPLE DATA</span>
                    </div>
                    <div className="strip">
                      <span className="ok">
                        Mon<i></i>
                      </span>
                      <span className="today">
                        Tue<i></i>
                      </span>
                      <span className="fut">Wed</span>
                      <span className="fut">Thu</span>
                      <span className="fut">Fri</span>
                    </div>
                    <div className="upanel">
                      <div className="uph">
                        <b>
                          Tue <span className="dt">15 Sep</span>
                        </b>
                        <span className="uhrs">7 h</span>
                        <span className="umeta">
                          <span className="a">Not posted</span>
                          <span className="b">Posted 17:42</span>
                        </span>
                      </div>
                      <div className="upb">
                        <span className="uq">What did you do?</span>
                        <div className="uline">
                          <span className="uin">
                            <i className="mk c1"></i>Booking flow
                          </span>
                          <span className="uin ty">
                            <i className="mk c1"></i>Development
                          </span>
                        </div>
                        <div className="uline u2">
                          <span className="uin">
                            Date validation and error states
                          </span>
                          <span className="uin h">4.5</span>
                        </div>
                        <div className="uline">
                          <span className="uin">
                            <i className="mk c2"></i>Login timeout
                          </span>
                          <span className="uin ty">
                            <i className="mk c2"></i>Testing
                          </span>
                        </div>
                        <div className="uline u2">
                          <span className="uin">Wrote regression tests</span>
                          <span className="uin h">2.5</span>
                        </div>
                        <span className="ulab">
                          Blockers<em>Optional</em>
                        </span>
                        <span className="bf filled" id="bf">
                          <span className="phd">What is holding work up?</span>
                          <span id="typed">
                            Waiting on API keys from the client
                          </span>
                          <span className="caret"></span>
                        </span>
                      </div>
                      <div className="ufoot">
                        <span className="ucb">
                          <i></i>Open to team comments
                        </span>
                        <span className="ubtns">
                          <span className="usec">Save</span>
                          <span className="post" id="post">
                            Post update
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <svg className="trail" id="trail" viewBox="0 0 792 584">
                <path className="halo" id="halo" d="M0 0" />
                <path className="ln" id="ln" d="M0 0" />
              </svg>
              <div className="fly" id="fly">
                <b>
                  Imali J. <span>Tue 17:42</span>
                </b>
                <span className="k">Waiting on API keys from the client</span>
              </div>
            </div>
          </div>
          <button className="replay" type="button" id="replay">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4.5 10a5.5 5.5 0 1 0 1.7-4" />
              <path d="M4 3.5v3.2h3.2" />
            </svg>
            Play it again
          </button>
        </div>
        <div className="doors">
          <a className="door" href="#week">
            <b>Writing the update?</b>
            <span>Follow one week, Monday to Friday</span>
          </a>
          <a className="door" href="#desk">
            <b>Reading the week?</b>
            <span>Skip to the manager's view</span>
          </a>
        </div>
      </div>
    </section>
  );
}
