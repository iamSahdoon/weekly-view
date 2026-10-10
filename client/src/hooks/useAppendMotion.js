import { useState } from "react";

// The row a person just added with "Add a line" (and the like) settles into place
// (polish, 2026-10-10; design §8.2 #24). Only that row, only once: rows already there
// on load, or remounted by a form reset, appear as they are.
//
//   const appended = useAppendMotion();
//   onClick={() => { list.append(blank); appended.mark(list.fields.length); }}
//   <li {...appended.props(index)}>

export function useAppendMotion() {
  const [index, setIndex] = useState(null);
  return {
    mark: setIndex,
    props: (i) =>
      i === index
        ? { "data-appended": "", onAnimationEnd: () => setIndex(null) }
        : {},
  };
}
