export function ProblemSection() {
  return (
    <section
      className="prob s-sp"
      id="prob"
      aria-labelledby="prob-h"
      data-scene="pass"
    >
      <div className="wrap">
        <div className="pl">
          <h2 id="prob-h" className="wipe" data-in="">
            Right now the week gets written five times.
          </h2>
          <div className="pile" id="pile" aria-hidden="true">
            <div
              className="fg f1"
              style={{ "--l-x": "0%", "--l-y": "4%", "--l-r": "-7deg" }}
            >
              <span className="fg-h">
                <svg viewBox="0 0 16 16">
                  <rect x="2" y="3" width="12" height="11" />
                  <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
                </svg>
                Status meeting
              </span>
              <span className="fg-l">Mon 09:30 to 10:00 · 8 people</span>
              <span className="fg-b">
                <i style={{ width: "80%" }}></i>
                <i style={{ width: "56%" }}></i>
              </span>
            </div>
            <div
              className="fg f2"
              style={{ "--l-x": "56%", "--l-y": "0%", "--l-r": "5deg" }}
            >
              <span className="fg-h">
                <svg viewBox="0 0 16 16">
                  <path d="M2 3h12v8H7l-3.5 3v-3H2z" />
                </svg>
                Direct message
              </span>
              <span className="fg-l">
                "Where are we with the booking flow?"
              </span>
              <span className="fg-b">
                <i style={{ width: "64%" }}></i>
              </span>
            </div>
            <div
              className="fg f3"
              style={{ "--l-x": "6%", "--l-y": "58%", "--l-r": "4deg" }}
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
                <i style={{ width: "70%" }}></i>
                <i style={{ width: "40%" }}></i>
              </span>
            </div>
            <div
              className="fg f4"
              style={{ "--l-x": "58%", "--l-y": "54%", "--l-r": "-4deg" }}
            >
              <span className="fg-h">
                <svg viewBox="0 0 16 16">
                  <rect x="1.5" y="2.5" width="13" height="11" />
                  <path d="M1.5 6.5h13M1.5 10h13M6 2.5v11M10.5 2.5v11" />
                </svg>
                status.xlsx
              </span>
              <span className="fg-grid">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </span>
            </div>
            <div
              className="fg f5"
              style={{ "--l-x": "30%", "--l-y": "30%", "--l-r": "-2deg" }}
            >
              <span className="fg-h">
                <svg viewBox="0 0 16 16">
                  <path d="M3 2h10v12H3z" />
                  <path d="M5.5 5h5M5.5 8h4" />
                </svg>
                Friday report
              </span>
              <span className="fg-l">"What did I do on Tuesday?"</span>
              <span className="fg-b">
                <i style={{ width: "46%" }}></i>
              </span>
            </div>
            <div className="one" id="one">
              <div className="one-h">
                <b>Tue 15 Sep</b>
                <span className="samp-u">SAMPLE DATA</span>
              </div>
              <div className="one-r">
                <b>Booking flow</b>
                <span>4.5 h</span>
              </div>
              <div className="one-r">
                <b>Login timeout</b>
                <span>2.5 h</span>
              </div>
              <div className="one-k">
                Blocker: waiting on API keys from the client
              </div>
              <div className="one-f">
                <span>Imali J. · posted 17:42</span>
                <em>Written once</em>
              </div>
            </div>
          </div>
        </div>
        <div>
          <ol className="five" id="five">
            <li>
              <span className="dd">Mon</span>
              <span className="t">A status meeting, to say it out loud.</span>
            </li>
            <li>
              <span className="dd">Tue</span>
              <span className="t">A message asking where things stand.</span>
            </li>
            <li>
              <span className="dd">Wed</span>
              <span className="t">A doc nobody else can find.</span>
            </li>
            <li>
              <span className="dd">Thu</span>
              <span className="t">A spreadsheet in someone else's format.</span>
            </li>
            <li>
              <span className="dd">Fri</span>
              <span className="t">A report pieced together from memory.</span>
            </li>
          </ol>
          <p className="once" data-reveal="">
            In WeeklyView it's written <em>once</em>, on the day it happens, and
            read from there.
          </p>
        </div>
      </div>
    </section>
  );
}
