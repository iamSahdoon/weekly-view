import { STEPS } from "./tourSteps.js";

// The guided tour's state (frontend_architecture.md §11.6), pure so it can be tested. Only
// the visitor moves the tour: Back, Next, a jump, Exit. An action step's outcome never
// does (owner feedback on PR #28, 2026-10-18): whether the visitor did it or pressed "Do it
// for me", the step stays, the card says what changed, and the tour waits for Next.
//
//   outcome   null — the action hasn't happened (or the step has none)
//             "doing" — "Do it for me" is running, or the action happened and its result
//                       is still reaching the screen: Back, Next and "Do it for me" wait
//             "done" — the result is on screen; the card explains it

export const INITIAL = {
  mode: "off", // "off" | "on"
  index: 0,
  run: 0, // bumped every time a step (re)starts
  phase: "idle", // "moving" | "shown" | "missing" | "lost"
  outcome: null,
  panel: false,
  resume: null,
  visited: [],
};

export function reducer(state, action) {
  const current = action.run === undefined || action.run === state.run;
  switch (action.type) {
    case "start":
      return {
        ...state,
        mode: "on",
        index: action.index,
        run: state.run + 1,
        phase: "moving",
        outcome: null,
        panel: false,
        resume: null,
      };
    case "go":
      // Back and Next wait while the step's action is running.
      if (state.outcome === "doing") return state;
      return action.index >= STEPS.length
        ? { ...state, mode: "off", phase: "idle", outcome: null, resume: null }
        : {
            ...state,
            index: Math.max(0, action.index),
            run: state.run + 1,
            phase: "moving",
            outcome: null,
          };
    case "retry":
      if (state.outcome === "doing") return state;
      return { ...state, run: state.run + 1, phase: "moving", outcome: null };
    case "phase": {
      if (!current) return state;
      const id = STEPS[state.index].id;
      const visited =
        action.phase === "shown" && !state.visited.includes(id)
          ? [...state.visited, id]
          : state.visited;
      return { ...state, phase: action.phase, visited };
    }
    // "Do it for me" pressed: once, on a shown step whose action hasn't happened.
    case "do":
      if (!current || state.phase !== "shown" || state.outcome !== null)
        return state;
      return { ...state, outcome: "doing" };
    // The action happened (the visitor's or the tour's): wait for its result.
    case "happened":
      if (!current || state.outcome !== null) return state;
      return { ...state, outcome: "doing" };
    // Its result is on screen: the card says so, and the step stays.
    case "done":
      if (!current || state.outcome === "done") return state;
      return { ...state, outcome: "done", phase: "shown" };
    // "Do it for me" gave up: the step is as it was, for the visitor to try.
    case "failed":
      if (!current || state.outcome !== "doing") return state;
      return { ...state, outcome: null };
    case "exit":
      return {
        ...state,
        mode: "off",
        phase: "idle",
        outcome: null,
        panel: false,
        resume: action.keep ? state.index : null,
      };
    case "panel":
      return { ...state, panel: action.open };
    default:
      return state;
  }
}
