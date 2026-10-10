import { StoryCaptions, StoryNotes } from "./StoryCaptions.jsx";
import { WEEK_STEPS } from "./storySteps.js";

// The team member's week, as a guided scroll story (owner decision, landing revamp;
// brand §6.0). On a wide screen with motion the section pins: one caption at a time is
// typed in the left column while a line is drawn to the part of the day card it explains,
// Monday to Friday, until the five days become the weekly report. On phones and with
// reduced motion it is stacked: each group of captions sits above the card it explains.
// `data-t` marks what step N points at; `data-anchor` says which side the line arrives on.

const DAYS = [
  {
    day: "Mon",
    date: "14 Sep",
    hours: "7.5 h",
    posted: "17:36",
    lines: [
      [
        "Booking flow",
        "5 h",
        "c1",
        "Development",
        "Wired the booking form to the new API",
      ],
      ["Login timeout", "2.5 h", "c2", "Testing", "Reproduced it on Safari"],
    ],
    // the first three steps point into Monday
    marks: { head: 0, line: 1, hours: 2 },
  },
  {
    day: "Tue",
    date: "15 Sep",
    hours: "7 h",
    posted: "17:42",
    comments: 2,
    open: true,
    lines: [
      [
        "Booking flow",
        "4.5 h",
        "c1",
        "Development",
        "Date validation and error states",
      ],
      ["Login timeout", "2.5 h", "c2", "Testing", "Wrote regression tests"],
    ],
    blocker: "Waiting on API keys from the client",
    thread: true,
  },
  {
    day: "Wed",
    date: "16 Sep",
    hours: "7.5 h",
    posted: "17:51",
    lines: [
      [
        "Login timeout",
        "3 h",
        "c1",
        "Development",
        "Fixed the session refresh",
      ],
      [
        "Booking flow",
        "4.5 h",
        "c7",
        "Research & study",
        "Read the calendar API guide",
      ],
    ],
  },
  {
    day: "Thu",
    date: "17 Sep",
    hours: "8 h",
    posted: "17:38",
    lines: [
      [
        "Booking flow",
        "4.5 h",
        "c1",
        "Development",
        "Mobile layout and styling",
      ],
      [
        "Code review",
        "3.5 h",
        "c5",
        "Review",
        "Reviewed Tharindu’s pull request",
      ],
    ],
  },
  {
    day: "Fri",
    date: "18 Sep",
    hours: "7.5 h",
    posted: "17:30",
    lines: [
      ["Booking flow", "5 h", "c1", "Development", "Saved-guest flow"],
      [
        "Login timeout",
        "2.5 h",
        "c2",
        "Testing",
        "Re-ran the regression tests",
      ],
    ],
    last: true,
  },
];

const mark = (step, anchor = "left") =>
  step === undefined ? {} : { "data-t": step, "data-anchor": anchor };

function DayCard({ d }) {
  const m = d.marks ?? {};
  return (
    <div className="day">
      <span className="d-wait" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </span>
      <div className="d-hd" {...mark(m.head)}>
        <b>
          {d.day}
          <span className="dt">{d.date}</span>
        </b>
        <span className="d-h" {...mark(m.hours, "top")}>
          {d.hours}
        </span>
        <span className="d-pt">Posted {d.posted}</span>
      </div>
      <div className="d-ctl">
        <span className="cc">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {d.comments ? `${d.comments} comments` : "No comments"}
        </span>
        <span className={d.open ? "sw on" : "sw"}>
          <i></i>Open to team comments
        </span>
      </div>
      <ul className="d-lines">
        {d.lines.map(([task, hours, tone, type, done], i) => (
          <li key={task + i} {...mark(i === 0 ? m.line : undefined)}>
            <span className="d-t">
              <b>
                {task}
                <small>Client A</small>
              </b>
              <span>{hours}</span>
            </span>
            <span className="d-ty">
              <i className={`mk ${tone}`}></i>
              {type}
            </span>
            <span className="d-d">{done}</span>
          </li>
        ))}
      </ul>
      {d.blocker && (
        <div className="d-blk" {...mark(3)}>
          <span className="lab">Blockers</span>
          <p className="bl">
            <span className="chk"></span>
            <span className="bt">{d.blocker}</span>
            <em>Key</em>
          </p>
        </div>
      )}
      {d.thread && (
        <div className="d-cmt" {...mark(4)}>
          <span className="lab">Comments</span>
          <div className="cm">
            <span className="avs">TS</span>
            <b>Tharindu S.</b>
            <time>Tue 18:02</time>
          </div>
          <p>Our sandbox keys work for testing. Want them?</p>
          <div className="rp">
            <div className="cm">
              <span className="avs">IJ</span>
              <b>Imali J.</b>
              <time>Tue 18:20</time>
            </div>
            <p>Yes please, that unblocks Wednesday.</p>
          </div>
        </div>
      )}
      {d.last && (
        <p className="d-rep">
          The week 38 report is built from these five days.
        </p>
      )}
    </div>
  );
}

const TASKS = [
  [
    "Booking flow",
    "23.5 h",
    "In progress",
    [
      ["c1", "Development"],
      ["c7", "Research & study"],
    ],
  ],
  [
    "Login timeout",
    "10.5 h",
    "Done",
    [
      ["c2", "Testing"],
      ["c1", "Development"],
    ],
  ],
  ["Code review", "3.5 h", "Done", [["c5", "Review"]]],
];

function WeekReport() {
  return (
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
            <div {...mark(6)}>
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
              {TASKS.map(([task, hours, status, types]) => (
                <tr key={task}>
                  <td>
                    <b>{task}</b>
                    <small>
                      {types.map(([tone, type]) => (
                        <span className="ty" key={type}>
                          <i className={`mk ${tone}`}></i>
                          {type}
                        </span>
                      ))}
                    </small>
                  </td>
                  <td className="r">{hours}</td>
                  <td className="r">
                    <span className="sel st">
                      <span className="s0" aria-hidden="true">
                        Set status
                      </span>
                      <span className="s1">{status}</span>
                      <span className="chev" aria-hidden="true"></span>
                    </span>
                  </td>
                </tr>
              ))}
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
          <div className="rfoot" {...mark(7)}>
            <span className="ucheck">
              <i></i>Ask for approval
            </span>
            <span className="ubtn">Submit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeekSection() {
  return (
    <section
      className="week s-deep"
      id="week"
      data-scene="pin"
      aria-labelledby="week-h"
    >
      <div className="wk-sticky">
        <div className="wrap wk-grid">
          <div className="wk-copy">
            <p className="eyebrow">For the team member</p>
            <h2 id="week-h" className="wipe" data-in="">
              Follow one person&rsquo;s week.
            </h2>
            <p className="wk-lede">
              Imali is on the team. Here is what she writes each day, and what
              happens on Friday.
            </p>
            <div className="wk-meta">
              <span>
                <b>Imali J.</b>, team member · W38 · 14–18 Sep
              </span>
              <span className="samp">SAMPLE DATA</span>
            </div>
            <StoryCaptions
              steps={WEEK_STEPS}
              id="wk-caps"
              label="What each part of the week is for"
            />
          </div>
          <div className="wk-vis">
            <div className="dr-row" aria-hidden="true">
              <div className="dayrail" id="dayrail-box" {...mark(5)}>
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
            <div className="wk-stage" id="wk-stage">
              <div className="track" id="track">
                <div className="ch">
                  <StoryNotes steps={WEEK_STEPS} from={0} count={3} />
                  <DayCard d={DAYS[0]} />
                </div>
                <div className="ch">
                  <StoryNotes steps={WEEK_STEPS} from={3} count={2} />
                  <DayCard d={DAYS[1]} />
                </div>
                <div className="ch">
                  <StoryNotes steps={WEEK_STEPS} from={5} count={1} />
                  <DayCard d={DAYS[2]} />
                  <DayCard d={DAYS[3]} />
                  <DayCard d={DAYS[4]} />
                </div>
              </div>
              <div className="ch ch-rep">
                <StoryNotes steps={WEEK_STEPS} from={6} count={2} />
                <WeekReport />
              </div>
            </div>
          </div>
        </div>
        <svg className="guide" id="wk-guide" aria-hidden="true">
          <path className="g-halo" d="M0 0" />
          <path className="g-ln" d="M0 0" />
          <path className="g-hd" d="M0 0" />
          <rect className="g-ring" x="0" y="0" width="0" height="0" rx="6" />
        </svg>
      </div>
    </section>
  );
}
