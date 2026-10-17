// The auth brand panel's looping sample week (owner decision, auth pages round three,
// 2026-10-17; design §8.5 entry 32). One step per timer tick: the chosen day moves Monday
// → Thursday, and on Thursday ("today") the day is posted — its square fills and a work
// line appears — then the loop starts again at Monday. Friday stays a holiday and is never
// chosen. 15 s a cycle. Under reduced motion the panel shows FINAL_STEP and never moves.

export const PREVIEW_DAYS = ["mon", "tue", "wed", "thu"];

export const PREVIEW_STEPS = Object.freeze([
  { day: "mon", thuPosted: false, ms: 3000 },
  { day: "tue", thuPosted: false, ms: 3000 },
  { day: "wed", thuPosted: false, ms: 3000 },
  { day: "thu", thuPosted: false, ms: 2200 },
  { day: "thu", thuPosted: true, ms: 3800 },
]);

/** The step shown when nothing moves: Thursday, posted. */
export const FINAL_STEP = PREVIEW_STEPS.length - 1;

/** Which content layer a step shows: a weekday, or Thursday before / after posting. */
export function previewLayer(step) {
  const { day, thuPosted } = PREVIEW_STEPS[step];
  if (day !== "thu") return day;
  return thuPosted ? "thu-posted" : "thu-empty";
}
