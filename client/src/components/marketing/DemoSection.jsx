// The demo invitation (owner decision, landing revamp): the three ways into the demo,
// and the honesty note (brand §6.4) — the product is new, so the proof is the demo.
// Every link is a plain <a href="/demo">: the demo is a different page load, and its
// chooser is where the role is picked.

const ROLES = [
  ["Team member", "Write today’s note and send the weekly report."],
  ["Manager", "Read the team dashboard and review a report."],
  ["Admin", "Invite people and set the team’s holidays."],
];

export function DemoSection() {
  return (
    <section className="demo s-sp" id="demo" aria-labelledby="demo-h">
      <div className="wrap">
        <div className="dm-head">
          <p className="eyebrow">The live demo</p>
          <h2 id="demo-h" className="wipe" data-in="">
            Try both sides yourself.
          </h2>
          <p>
            Pick a role and click around. Everything works on sample data, and a
            refresh starts over.
          </p>
        </div>
        <ul className="roles">
          {ROLES.map(([role, what], i) => (
            <li key={role} data-reveal="" style={{ "--l-i": i }}>
              <a className="role" href="/demo">
                <b>{role}</b>
                <span className="role-d">{what}</span>
                <span className="role-go" aria-hidden="true">
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M2 7h9M7.5 3.5L11 7l-3.5 3.5" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <aside className="honest" aria-labelledby="new-h">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <path pathLength="1" data-draw="" d="M22 39V21" />
            <path
              pathLength="1"
              data-draw=""
              style={{ "--l-i": 2 }}
              d="M22 27c-8.5 0-13-4.5-13-13 8.5 0 13 4.5 13 13z"
            />
            <path
              pathLength="1"
              data-draw=""
              style={{ "--l-i": 3 }}
              d="M22 22c0-7.5 4-11.5 11.5-11.5 0 7.5-4 11.5-11.5 11.5z"
            />
            <path
              pathLength="1"
              data-draw=""
              style={{ "--l-i": 4 }}
              d="M13 39h18"
            />
          </svg>
          <div>
            <h3 id="new-h">New, and saying so.</h3>
            <p>
              WeeklyView is new. There are no customers to quote yet, so the
              proof is the demo. Everyone on this page belongs to a fictional
              sample team.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
