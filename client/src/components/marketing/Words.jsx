// A heading's words, each in its own mask (landing.css `[data-split] .w`): the page's
// motion lifts them into place one after another. `from` continues the word count
// across the pieces of one heading. The text itself stays in reading order.

export function Words({ text, from = 0 }) {
  let index = from;
  return text.split(/(\s+)/).map((part, i) => {
    if (!part) return null;
    if (/^\s+$/.test(part)) return part;
    const word = (
      <span className="w" key={i}>
        <span className="wi" style={{ "--l-wi": index }}>
          {part}
        </span>
      </span>
    );
    index += 1;
    return word;
  });
}
