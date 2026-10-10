export function DeskSection() {
  return (
    <section
      className="desk s-deep"
      id="desk"
      aria-labelledby="desk-h"
      data-scene="pass"
    >
      <div className="wrap">
        <div className="head">
          <h2 id="desk-h" className="wipe" data-in="">
            The other side of the desk: the whole week, in minutes.
          </h2>
          <div className="dintro">
            <p>
              For managers and founders. Everyone's days roll into one
              dashboard, so the status meeting becomes a page you read before
              Monday. Imali's Tuesday blocker is already on it.
            </p>
            <dl className="tally" data-in="">
              <div>
                <dt>Daily updates this week</dt>
                <dd>
                  <span data-count="34" data-dur="1400">
                    34
                  </span>
                  <small> of 40</small>
                </dd>
              </div>
              <div>
                <dt>People</dt>
                <dd>
                  <span data-count="8" data-dur="900">
                    8
                  </span>
                </dd>
              </div>
              <div>
                <dt>Pages to read</dt>
                <dd>1</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="mon-wrap" id="monwrap">
          <figure className="monitor" data-tilt="2" aria-labelledby="mon-cap">
            <figcaption className="vh" id="mon-cap">
              The team dashboard for week 38, on sample data. The filter buttons
              narrow the team table.
            </figcaption>
            <div className="min">
              <div className="mtop">
                <b>Team dashboard</b>
                <span>W38 · 14–18 Sep</span>
                <span className="samp-u">SAMPLE DATA</span>
              </div>
              <div
                className="mfilt"
                role="group"
                aria-label="Filter the team table"
              >
                <span className="lbl" aria-hidden="true">
                  Show
                </span>
                <button
                  className="fbtn"
                  type="button"
                  data-f="all"
                  aria-pressed="true"
                >
                  Everyone
                </button>
                <button
                  className="fbtn"
                  type="button"
                  data-f="corr"
                  aria-pressed="false"
                >
                  Needs correction
                </button>
                <button
                  className="fbtn"
                  type="button"
                  data-f="none"
                  aria-pressed="false"
                >
                  Not started
                </button>
                <button
                  className="fbtn"
                  type="button"
                  data-f="blk"
                  aria-pressed="false"
                >
                  Has blocker
                </button>
                <p className="fcount" id="fcount" aria-live="polite">
                  Showing all 8 people
                </p>
              </div>
              <div className="mmet">
                <div>
                  <span>Filed this week</span>
                  <b>
                    <span data-count="6" data-dur="1000">
                      6
                    </span>
                    <small> / 8</small>
                  </b>
                </div>
                <div>
                  <span>Needs correction</span>
                  <b className="c">
                    <span data-count="1" data-dur="700">
                      1
                    </span>
                  </b>
                </div>
                <div>
                  <span>Open blockers</span>
                  <b>
                    <span data-count="3" data-dur="900">
                      3
                    </span>
                  </b>
                </div>
              </div>
              <div className="mgrid">
                <div className="mscroll" role="region" aria-label="Team table">
                  <table className="mtbl" id="mt" data-in="">
                    <thead>
                      <tr>
                        <th scope="col" className="c-p">
                          Person
                        </th>
                        <th scope="col" className="c-u">
                          Mon to Fri
                        </th>
                        <th scope="col" className="c-j">
                          Project
                        </th>
                        <th scope="col" className="r c-h">
                          Hours
                        </th>
                        <th scope="col" className="c-b">
                          Blocker
                        </th>
                        <th scope="col" className="r c-s">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr data-f="">
                        <td className="nm">Nadia F.</td>
                        <td>
                          <span
                            className="ups"
                            role="img"
                            aria-label="5 of 5 days posted"
                          >
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                          </span>
                        </td>
                        <td>Client A</td>
                        <td className="r">38.5</td>
                        <td>
                          <span className="dash">–</span>
                        </td>
                        <td className="r">
                          <span className="chip c-appr">Approved</span>
                        </td>
                      </tr>
                      <tr data-f="corr blk">
                        <td className="nm">Ruwan P.</td>
                        <td>
                          <span
                            className="ups"
                            role="img"
                            aria-label="5 of 5 days posted"
                          >
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                          </span>
                        </td>
                        <td>Internal tools</td>
                        <td className="r">41</td>
                        <td>
                          <span className="chip c-corr">Tue</span>
                        </td>
                        <td className="r">
                          <span className="chip c-corr">Needs correction</span>
                        </td>
                      </tr>
                      <tr data-f="blk">
                        <td className="nm">Imali J.</td>
                        <td>
                          <span
                            className="ups"
                            role="img"
                            aria-label="5 of 5 days posted"
                          >
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                          </span>
                        </td>
                        <td>Client A</td>
                        <td className="r">37.5</td>
                        <td>
                          <span className="chip c-corr">Tue</span>
                        </td>
                        <td className="r">
                          <span className="chip c-subm">Submitted</span>
                        </td>
                      </tr>
                      <tr data-f="">
                        <td className="nm">Tharindu S.</td>
                        <td>
                          <span
                            className="ups"
                            role="img"
                            aria-label="5 of 5 days posted"
                          >
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                          </span>
                        </td>
                        <td>Client A</td>
                        <td className="r">40</td>
                        <td>
                          <span className="dash">–</span>
                        </td>
                        <td className="r">
                          <span className="chip c-subm">Submitted</span>
                        </td>
                      </tr>
                      <tr data-f="blk">
                        <td className="nm">Ayesha C.</td>
                        <td>
                          <span
                            className="ups"
                            role="img"
                            aria-label="4 of 5 days posted"
                          >
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i></i>
                          </span>
                        </td>
                        <td>Marketing</td>
                        <td className="r">30</td>
                        <td>
                          <span className="chip c-corr">Mon</span>
                        </td>
                        <td className="r">
                          <span className="chip c-draft">Draft</span>
                        </td>
                      </tr>
                      <tr data-f="none">
                        <td className="nm">Dinesh K.</td>
                        <td>
                          <span
                            className="ups"
                            role="img"
                            aria-label="no days posted"
                          >
                            <i></i>
                            <i></i>
                            <i></i>
                            <i></i>
                            <i></i>
                          </span>
                        </td>
                        <td>Internal tools</td>
                        <td className="r">–</td>
                        <td>
                          <span className="dash">–</span>
                        </td>
                        <td className="r">
                          <span className="chip c-none">Not started</span>
                        </td>
                      </tr>
                      <tr data-f="">
                        <td className="nm">Malith W.</td>
                        <td>
                          <span
                            className="ups"
                            role="img"
                            aria-label="5 of 5 days posted"
                          >
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                          </span>
                        </td>
                        <td>R&amp;D</td>
                        <td className="r">39</td>
                        <td>
                          <span className="dash">–</span>
                        </td>
                        <td className="r">
                          <span className="chip c-appr">Approved</span>
                        </td>
                      </tr>
                      <tr data-f="">
                        <td className="nm">Sanduni B.</td>
                        <td>
                          <span
                            className="ups"
                            role="img"
                            aria-label="5 of 5 days posted"
                          >
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                            <i className="p"></i>
                          </span>
                        </td>
                        <td>R&amp;D</td>
                        <td className="r">36</td>
                        <td>
                          <span className="dash">–</span>
                        </td>
                        <td className="r">
                          <span className="chip c-subm">Submitted</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mside">
                  <h3>Open blockers</h3>
                  <ul>
                    <li className="me">
                      <b>
                        Imali J. <span>Tue</span>
                      </b>
                      Waiting on API keys from the client
                    </li>
                    <li>
                      <b>
                        Ayesha C. <span>Mon</span>
                      </b>
                      Launch copy waiting on sign-off
                    </li>
                    <li>
                      <b>
                        Ruwan P. <span>Tue</span>
                      </b>
                      Staging migration needs IT approval
                    </li>
                  </ul>
                  <p className="mnote">
                    Not started is a fact, never a scold. There's no deadline,
                    so nothing here is late.
                  </p>
                </div>
              </div>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
