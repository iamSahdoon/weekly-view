// The captions of the landing page's two scroll stories (the team member's week, the
// manager's dashboard). Each step has a short kicker and one sentence.
//
// `StoryCaptions` is the pinned column: every caption is in the DOM, stacked in one grid
// cell, and the page's motion shows the current one. The real sentence (`.cap-full`) is
// always there, so a screen reader reads every step at once; the typed copy beside it is
// a visual duplicate, hidden from assistive technology. `StoryNotes` is the same steps as
// a plain numbered list, for the stacked layout (phones, and reduced motion): captions
// above the mock-up they explain. Only one of the two is displayed at a time.

export function StoryCaptions({ steps, id, label }) {
  return (
    <div className="story-caps">
      <ol className="caps" id={id} aria-label={label}>
        {steps.map((step, i) => (
          <li className="cap" key={step.kicker + i} data-f={step.f}>
            <span className="cap-k">{step.kicker}</span>
            <p className="cap-t">
              <span className="cap-full">{step.text}</span>
              <span className="cap-ty" aria-hidden="true"></span>
            </p>
          </li>
        ))}
      </ol>
      <div className="sprog" aria-hidden="true">
        <span className="sprog-n">
          <b>1</b> / {steps.length}
        </span>
        <span className="sprog-bar">
          {steps.map((step, i) => (
            <i key={step.kicker + i}></i>
          ))}
        </span>
      </div>
    </div>
  );
}

export function StoryNotes({ steps, from = 0, count = steps.length - from }) {
  return (
    <ol className="notes" start={from + 1}>
      {steps.slice(from, from + count).map((step, i) => (
        <li key={step.kicker + i}>
          <span className="note-n" aria-hidden="true">
            {from + i + 1}
          </span>
          <span>
            <b>{step.kicker}.</b> {step.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
