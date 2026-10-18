// Where the tour's tooltip goes (owner request, 2026-10-17). Pure geometry, so it can be
// tested without a browser. Rects are { top, left, width, height } in viewport pixels.

export const GAP = 12; // between the highlight and the tooltip
export const EDGE = 12; // between the tooltip and the viewport's edge
export const RING = 6; // the highlight's breathing room around its element

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

/** The highlighted area: the element's rect grown by RING on every side. */
export function padRect(rect, pad = RING) {
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

/** The highlight kept 1px inside the viewport, so its whole outline shows. */
export function withinView(rect, view) {
  if (!rect) return rect;
  const top = Math.max(1, rect.top);
  const left = Math.max(1, rect.left);
  const bottom = Math.min(view.height - 1, rect.top + rect.height);
  const right = Math.min(view.width - 1, rect.left + rect.width);
  if (bottom <= top || right <= left) return rect;
  return { top, left, width: right - left, height: bottom - top };
}

/**
 * A card beside the highlight, never on it: below, above, right or left, the first
 * with room (a step may name the side to try first — beside a ⋯ menu, say, so the menu
 * opens clear of it), centred on the highlight and kept inside the viewport. With no
 * room on any side (a highlight as big as the screen) it sits in the bottom-right corner.
 */
export function placeTooltip(target, tip, view, prefer, inset = 0) {
  // `inset`: the demo bar across the top, which the tooltip leaves in reach.
  const ceiling = inset + EDGE;
  if (!target) {
    return {
      side: "center",
      top: Math.max(EDGE, (view.height - tip.height) / 2),
      left: Math.max(EDGE, (view.width - tip.width) / 2),
    };
  }
  const bottom = target.top + target.height;
  const right = target.left + target.width;
  const across = clamp(
    target.left + target.width / 2 - tip.width / 2,
    EDGE,
    view.width - tip.width - EDGE,
  );
  const down = clamp(
    target.top + target.height / 2 - tip.height / 2,
    ceiling,
    view.height - tip.height - EDGE,
  );
  const sides = {
    bottom: () =>
      view.height - bottom - GAP >= tip.height + EDGE && {
        side: "bottom",
        top: bottom + GAP,
        left: across,
      },
    top: () =>
      target.top - GAP >= tip.height + ceiling && {
        side: "top",
        top: target.top - GAP - tip.height,
        left: across,
      },
    right: () =>
      view.width - right - GAP >= tip.width + EDGE && {
        side: "right",
        top: down,
        left: right + GAP,
      },
    left: () =>
      target.left - GAP >= tip.width + EDGE && {
        side: "left",
        top: down,
        left: target.left - GAP - tip.width,
      },
  };
  const order = ["bottom", "top", "right", "left"];
  if (prefer) order.unshift(prefer);
  for (const side of order) {
    const placed = sides[side]();
    if (placed) return placed;
  }
  return {
    side: "corner",
    top: view.height - tip.height - EDGE,
    left: view.width - tip.width - EDGE,
  };
}

/**
 * On a phone the tooltip is a sheet across the bottom of the screen — or across the top
 * when, even scrolled as far as the page allows, the bottom one would cover the
 * highlight and the top one wouldn't (the weekly form's bar, the end of a page). Decided
 * once per step, with the scroll that goes with it, so the sheet doesn't jump about as
 * the page moves. `page` says how far the page can scroll, whether the target is pinned
 * (it doesn't scroll at all) and the demo bar's height (`offset`).
 */
export function planSheet(
  target,
  sheetHeight,
  view,
  { safeTop = 0, scroll = 0, maxScroll = 0, pinned = false, offset = 0 } = {},
) {
  // The scroll that brings the target into [top, bottom], within the page's range.
  const fit = (top, bottom) => {
    if (pinned) return 0;
    const end = target.top + target.height;
    if (target.top >= top && end <= bottom) return 0;
    const room = bottom - top;
    const delta =
      target.height > room
        ? target.top - top
        : target.top - top - (room - target.height) / 2;
    return Math.max(-scroll, Math.min(delta, maxScroll - scroll));
  };
  const low = { top: safeTop + EDGE, bottom: view.height - sheetHeight - EDGE };
  const below = fit(low.top, low.bottom);
  const lowTop = target.top - below;
  const tall = target.height > low.bottom - low.top;
  if (
    lowTop + target.height <= view.height - sheetHeight ||
    (tall && lowTop >= low.top - 1)
  ) {
    return { side: "bottom", delta: below };
  }
  // A top sheet sits under the demo bar (`offset`), which stays in reach.
  const under = offset + sheetHeight;
  const above = fit(under + EDGE, view.height - EDGE);
  if (target.top - above >= under) return { side: "top", delta: above };
  return { side: "bottom", delta: below };
}

/**
 * The part of the highlight the sheet leaves visible: the sheet never covers what is
 * highlighted, so a highlight taller than the space left is cut to that space.
 */
export function clipToOpenArea(target, sheet, view) {
  if (!target || !sheet) return target;
  const top = sheet.side === "top" ? (sheet.offset ?? 0) + sheet.height : 0;
  const bottom =
    sheet.side === "top" ? view.height : view.height - sheet.height;
  const from = Math.max(target.top, top);
  const to = Math.min(target.top + target.height, bottom);
  if (to <= from) return target;
  return { ...target, top: from, height: to - from };
}

/**
 * The part of a highlight below the sticky bars at the top (the demo bar and the top
 * bar). A target that scrolls with the page — a tall form section "Do it for me" is
 * working down — passes under them, and its outline must not be drawn across them.
 */
export function clipBelow(target, top) {
  if (!target || target.top >= top) return target;
  const bottom = target.top + target.height;
  if (bottom <= top) return target;
  return { ...target, top, height: bottom - top };
}

/**
 * How far to scroll a highlight (on a wide screen) so the tooltip fits below it: 0 when
 * it is on screen with room below already; otherwise the distance that puts it near the
 * top of the open area, below the sticky bars. Null when the two can't fit together —
 * the caller then just brings the highlight into view.
 */
export function roomBelow(target, tip, view, safeTop) {
  const bottom = target.top + target.height;
  const visible = target.top >= safeTop && bottom <= view.height;
  if (visible && view.height - bottom - GAP >= tip.height + EDGE) return 0;
  if (target.height + GAP + tip.height + EDGE * 2 > view.height - safeTop) {
    return null;
  }
  return target.top - (safeTop + EDGE);
}
