// The problem as a before → after (owner decision, landing revamp): how the week is
// reported in most teams, and how it is with WeeklyView. The left card is the scatter
// (meeting, chat, doc, spreadsheet, Friday report); the right card is the one note that
// replaces it. Both are fully readable without motion; with motion they arrive from
// their own side and the arrow between them is drawn.

const BEFORE = [
  "Updates are scattered across chat, meetings and docs.",
  "Managers keep asking “where are we with this?”",
  "On Friday, someone rebuilds the week from memory.",
];
const AFTER = [
  "Everyone writes one short note when their day ends.",
  "Managers read the whole team’s week on one page.",
  "Friday’s report builds itself from the five days.",
];

export function ProblemSection() {
  return (
    <section className="prob s-sp" id="prob" aria-labelledby="prob-h">
      <div className="wrap">
        <div className="pb-head">
          <p className="eyebrow">Why it helps</p>
          <h2 id="prob-h" data-head="">
            From scattered updates to one short note a day.
          </h2>
        </div>
        <div className="ba">
          <article className="ba-card ba-before" data-reveal="left">
            <h3>
              <span className="ba-k">Before</span>In most teams…
            </h3>
            <div className="pile" aria-hidden="true">
              <div
                className="fg"
                style={{ "--l-x": "2%", "--l-y": "6%", "--l-r": "-6deg" }}
              >
                <span className="fg-h">
                  <svg viewBox="0 0 16 16">
                    <rect x="2" y="3" width="12" height="11" />
                    <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
                  </svg>
                  Status meeting
                </span>
                <span className="fg-l">Mon 09:30 to 10:00</span>
              </div>
              <div
                className="fg"
                style={{ "--l-x": "50%", "--l-y": "0%", "--l-r": "4deg" }}
              >
                <span className="fg-h">
                  <svg viewBox="0 0 16 16">
                    <path d="M2 3h12v8H7l-3.5 3v-3H2z" />
                  </svg>
                  Chat message
                </span>
                <span className="fg-l">
                  “Where are we with the booking flow?”
                </span>
              </div>
              <div
                className="fg"
                style={{ "--l-x": "6%", "--l-y": "52%", "--l-r": "3deg" }}
              >
                <span className="fg-h">
                  <svg viewBox="0 0 16 16">
                    <path d="M3 1.5h7l3 3v10H3z" />
                    <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" />
                  </svg>
                  notes_final_v3.doc
                </span>
                <span className="fg-b">
                  <i style={{ width: "90%" }}></i>
                  <i style={{ width: "60%" }}></i>
                </span>
              </div>
              <div
                className="fg"
                style={{ "--l-x": "52%", "--l-y": "48%", "--l-r": "-3deg" }}
              >
                <span className="fg-h">
                  <svg viewBox="0 0 16 16">
                    <path d="M3 2h10v12H3z" />
                    <path d="M5.5 5h5M5.5 8h4" />
                  </svg>
                  Friday report
                </span>
                <span className="fg-l">“What did I do on Tuesday?”</span>
              </div>
            </div>
            <ul className="ba-list">
              {BEFORE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
          <svg className="ba-arrow" viewBox="0 0 64 24" aria-hidden="true">
            <path pathLength="1" data-draw="" d="M2 12h56" />
            <path
              pathLength="1"
              data-draw=""
              style={{ "--l-i": 3 }}
              d="M48 3l10 9-10 9"
            />
          </svg>
          <article
            className="ba-card ba-after"
            data-reveal="right"
            style={{ "--l-d": "120ms" }}
          >
            <h3>
              <span className="ba-k">After</span>With WeeklyView…
            </h3>
            <div className="one-stage">
              <div className="one" id="one">
                <div className="one-h">
                  <b>
                    Tue<span className="dt">15 Sep</span>
                    <span className="one-hr">7 h</span>
                  </b>
                  <span className="samp-u">SAMPLE DATA</span>
                </div>
                <div className="one-r">
                  <span>
                    <b>
                      Booking flow<small>Client A</small>
                    </b>
                    <span className="d-ty">
                      <i className="mk c1"></i>Development
                    </span>
                  </span>
                  <span>4.5 h</span>
                </div>
                <div className="one-r">
                  <span>
                    <b>
                      Login timeout<small>Client A</small>
                    </b>
                    <span className="d-ty">
                      <i className="mk c2"></i>Testing
                    </span>
                  </span>
                  <span>2.5 h</span>
                </div>
                <div className="one-k">
                  <p className="bl">
                    <span className="bt">
                      Waiting on API keys from the client
                    </span>
                    <em>Key</em>
                  </p>
                </div>
                <div className="one-f">
                  <span>Imali J. · posted 17:42</span>
                  <em>Written once</em>
                </div>
              </div>
            </div>
            <ul className="ba-list">
              {AFTER.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
