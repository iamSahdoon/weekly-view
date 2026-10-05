import { TASK_TYPES, TASK_TYPE_COLORS } from "./constants.js";

// Chart configuration in one place so the four charts cannot drift (frontend_architecture.md
// §10; design §7.3). Strings only, no React. SVG presentation attributes accept
// `var(--token)`, so the theme switch needs no chart re-render. No hex, ever.

/** The seven task types → tokens. The same map the day panel and the form use. */
export const typeColor = TASK_TYPE_COLORS;
export { TASK_TYPES };

export const gridProps = { vertical: false, stroke: "var(--hair)" };
export const tickProps = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fill: "var(--mut)",
};
// Category names are words, not numerals, so they are not in the mono list (design §0.5).
export const labelTickProps = {
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  fill: "var(--body)",
};
export const axisLineProps = { stroke: "var(--hair2)" }; // the baseline only; no Y axis line
export const cursorProps = { stroke: "var(--hair2)", strokeWidth: 1 }; // line charts only
export const barCursorProps = { fill: "var(--tint)" };

export const TREND_HEIGHT = 260;
export const BARS_HEIGHT = 240;
export const ANIMATION_MS = 320;
export const MAX_Y_TICKS = 4;
export const MAX_BAR = 28;

// The trend's two series — not task categories, so not the --c colours.
export const seriesColor = { team: "var(--acc)", person: "var(--ink)" };

/** X ticks: every one at 8 categories or fewer, else every other with the last shown. */
export function xTicks(categories) {
  if (categories.length <= 8) return categories;
  const last = categories.length - 1;
  return categories.filter((_, i) => i % 2 === last % 2);
}
