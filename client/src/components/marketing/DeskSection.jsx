import { StoryCaptions, StoryNotes } from "./StoryCaptions.jsx";
import { DESK_STEPS } from "./storySteps.js";

// The manager's side, as a guided scroll story (owner decision, landing revamp). On a wide
// screen with motion the dashboard pins: each caption is typed above it while a line is
// drawn to the part it explains and the rest dims; the "Show" buttons switch as the
// visitor scrolls. Stacked (phones, reduced motion), the captions are a list above the
// dashboard and the buttons are there to press. `data-t` marks what step N points at
// (`data-t-end` closes a target that spans a column); `f` is the filter a step shows.

export function DeskSection() {
  return (
    <section
      className="desk s-deep"
      id="desk"
      aria-labelledby="desk-h"
      data-scene="pin"
    >
      <div className="dk-sticky">
        <div className="wrap">
          <div className="dk-head">
            <div className="dk-copy">
              <p className="eyebrow">For managers</p>
              <h2 id="desk-h" data-head="">
                The manager&rsquo;s side: the whole week on one page.
              </h2>
              <p className="dk-lede">
                Everyone&rsquo;s daily notes roll into one dashboard. Here is
                what each part of it tells you.
              </p>
            </div>
            <StoryCaptions
              steps={DESK_STEPS}
              id="dk-caps"
              label="What each part of the dashboard tells you"
            />
          </div>
          <StoryNotes steps={DESK_STEPS} />
          <div className="mon-wrap" id="monwrap">
            <figure className="monitor" aria-labelledby="mon-cap">
              <figcaption className="vh" id="mon-cap">
                The team dashboard for week 38, on sample data. The filter
                buttons narrow the team table.
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
                    data-t="6"
                    data-anchor="top"
                    aria-pressed="true"
                  >
                    Everyone
                  </button>
                  <button
                    className="fbtn"
                    type="button"
                    data-f="corr"
                    data-t="7"
                    data-anchor="top"
                    aria-pressed="false"
                  >
                    Needs correction
                  </button>
                  <button
                    className="fbtn"
                    type="button"
                    data-f="none"
                    data-t="8"
                    data-anchor="top"
                    aria-pressed="false"
                  >
                    Not started
                  </button>
                  <button
                    className="fbtn"
                    type="button"
                    data-f="blk"
                    data-t="9"
                    data-anchor="top"
                    aria-pressed="false"
                  >
                    Has blocker
                  </button>
                  <p className="fcount" id="fcount" aria-live="polite">
                    Showing all 8 people
                  </p>
                </div>
                <div className="mmet">
                  <div data-t="0" data-anchor="top">
                    <span>Filed this week</span>
                    <b className="tn-acc">
                      <span data-count="6" data-dur="1000">
                        6
                      </span>
                      <small> / 8</small>
                    </b>
                    <p className="sub">
                      <span data-count="2" data-dur="700">
                        2
                      </span>{" "}
                      not yet filed
                    </p>
                  </div>
                  <div data-t="1" data-anchor="top">
                    <span>Compliance</span>
                    <b className="tn-ok">
                      <span data-count="75" data-dur="1100">
                        75
                      </span>
                      %
                    </b>
                    <p className="sub">this week</p>
                  </div>
                  <div data-t="2" data-anchor="top">
                    <span>Needs correction</span>
                    <b className="tn-corr">
                      <span data-count="1" data-dur="700">
                        1
                      </span>
                    </b>
                  </div>
                  <div data-t="3" data-anchor="top">
                    <span>Open blockers</span>
                    <b className="tn-warn">
                      <span data-count="3" data-dur="900">
                        3
                      </span>
                    </b>
                    <p className="sub">
                      raised by{" "}
                      <span data-count="3" data-dur="900">
                        3
                      </span>{" "}
                      people
                    </p>
                  </div>
                </div>
                <div className="mgrid">
                  <div className="mleft">
                    <div
                      className="mscroll"
                      role="region"
                      aria-label="Team table"
                    >
                      <table className="mtbl" id="mt">
                        <thead>
                          <tr>
                            <th scope="col" className="c-p">
                              Person
                            </th>
                            <th
                              scope="col"
                              className="c-u"
                              data-t="4"
                              data-anchor="top"
                            >
                              Updates
                            </th>
                            <th scope="col" className="c-j">
                              Projects
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
                            <td className="nm">
                              <span className="av" aria-hidden="true">
                                NF
                              </span>
                              Nadia F.
                            </td>
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
                              <span className="chip md c-appr">Approved</span>
                            </td>
                          </tr>
                          <tr data-f="corr blk">
                            <td className="nm">
                              <span className="av" aria-hidden="true">
                                RP
                              </span>
                              Ruwan P.
                            </td>
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
                              <span className="chip md c-corr">
                                Needs correction
                              </span>
                            </td>
                          </tr>
                          <tr data-f="blk">
                            <td className="nm">
                              <span className="av" aria-hidden="true">
                                IJ
                              </span>
                              Imali J.
                            </td>
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
                              <span className="chip md c-subm">Submitted</span>
                            </td>
                          </tr>
                          <tr data-f="">
                            <td className="nm">
                              <span className="av" aria-hidden="true">
                                TS
                              </span>
                              Tharindu S.
                            </td>
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
                              <span className="chip md c-subm">Submitted</span>
                            </td>
                          </tr>
                          <tr data-f="blk">
                            <td className="nm">
                              <span className="av" aria-hidden="true">
                                AC
                              </span>
                              Ayesha C.
                            </td>
                            <td>
                              <span
                                className="ups"
                                role="img"
                                aria-label="4 of 5 days posted, Friday missing"
                              >
                                <i className="p"></i>
                                <i className="p"></i>
                                <i className="p"></i>
                                <i className="p"></i>
                                <i className="m"></i>
                              </span>
                            </td>
                            <td>Marketing</td>
                            <td className="r">30</td>
                            <td>
                              <span className="chip c-corr">Mon</span>
                            </td>
                            <td className="r">
                              <span className="chip md c-draft">Draft</span>
                            </td>
                          </tr>
                          <tr data-f="none">
                            <td className="nm">
                              <span className="av" aria-hidden="true">
                                DK
                              </span>
                              Dinesh K.
                            </td>
                            <td>
                              <span
                                className="ups"
                                role="img"
                                aria-label="No days posted: all five missing"
                              >
                                <i className="m"></i>
                                <i className="m"></i>
                                <i className="m"></i>
                                <i className="m"></i>
                                <i className="m"></i>
                              </span>
                            </td>
                            <td>Internal tools</td>
                            <td className="r">–</td>
                            <td>
                              <span className="dash">–</span>
                            </td>
                            <td className="r">
                              <span className="chip md c-none">
                                Not started
                              </span>
                            </td>
                          </tr>
                          <tr data-f="">
                            <td className="nm">
                              <span className="av" aria-hidden="true">
                                MW
                              </span>
                              Malith W.
                            </td>
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
                              <span className="chip md c-appr">Approved</span>
                            </td>
                          </tr>
                          <tr data-f="">
                            <td className="nm">
                              <span className="av" aria-hidden="true">
                                SB
                              </span>
                              Sanduni B.
                            </td>
                            <td data-t-end="4">
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
                              <span className="chip md c-subm">Submitted</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <ul
                      data-t="5"
                      data-anchor="top"
                      className="mleg"
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
        <svg className="guide" id="dk-guide" aria-hidden="true">
          <path className="g-dim" d="M0 0" />
          <path className="g-halo" d="M0 0" />
          <path className="g-ln" d="M0 0" />
          <path className="g-hd" d="M0 0" />
          <rect className="g-ring" x="0" y="0" width="0" height="0" rx="6" />
        </svg>
      </div>
    </section>
  );
}
