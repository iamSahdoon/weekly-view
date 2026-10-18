import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WEEKDAYS } from "../../lib/constants.js";
import { matchRoute } from "../demoRoutes.js";
import { createDemoStore } from "../demoStore.js";
import { CAST } from "../fixtures.js";
import {
  clipBelow,
  clipToOpenArea,
  padRect,
  placeTooltip,
  planSheet,
  roomBelow,
  withinView,
} from "../tour/tourPlacement.js";
import {
  SETUP,
  freeInviteEmail,
  prepare,
  tourContext,
} from "../tour/tourSetup.js";
import { INITIAL, reducer } from "../tour/tourState.js";
import {
  AUDIENCES,
  CAPABILITIES,
  CHAPTERS,
  NOT_IN_TOUR,
  PERSONAS,
  STEPS,
  tourMinutes,
} from "../tour/tourSteps.js";

// The guided demo tour (owner request, 2026-10-17): every feature of the manual's index
// and every role capability of the requirements has a step (or a stated reason it has
// none); every step points at a `data-tour` target that exists; an action never moves the
// tour on (owner feedback on PR #28, 2026-10-18); the setup helpers put the store in the
// state each step needs; the placement maths; and the tour's code reaching the real app
// only as a dynamic import.

const doc = (name) =>
  readFileSync(new URL(`../../../../docs/${name}`, import.meta.url), "utf8");

/** The feature names in USER_MANUAL.md's "Feature index" table. */
function manualFeatures() {
  const text = doc("USER_MANUAL.md");
  const start = text.indexOf("## Feature index");
  const end = text.indexOf("\n---", start);
  return text
    .slice(start, end)
    .split("\n")
    .filter((line) => line.startsWith("| "))
    .slice(2) // the header and its separator
    .map((line) => line.split("|")[1].trim());
}

/** The bullets and the admins' line of requirments_doc.md §1 "Roles". */
function roleCapabilities() {
  const text = doc("requirments_doc.md");
  const start = text.indexOf("### Roles");
  const end = text.indexOf("### Authentication Features");
  const section = text.slice(start, end);
  const bullets = [];
  let role = null;
  let current = null;
  for (const line of section.split("\n")) {
    if (line.startsWith("**Team Member**")) role = "member";
    else if (line.startsWith("**Manager / Admin**")) role = "manager";
    if (line.startsWith("- ")) {
      current = { role, text: line.slice(2).trim() };
      bullets.push(current);
    } else if (current && line.startsWith("  ")) {
      current.text += ` ${line.trim()}`;
    } else {
      current = null;
    }
  }
  const admins = section.slice(section.indexOf("**Admins only:**"));
  return { bullets, admins: admins.replace(/\s+/g, " ") };
}

const ROLE_AUDIENCE = {
  member: "everyone",
  manager: "managers",
  admin: "admins",
};

describe("every feature has a step", () => {
  const features = manualFeatures();
  const covered = new Set(STEPS.flatMap((step) => step.features));

  it("reads the manual's feature index", () => {
    expect(features.length).toBeGreaterThan(60);
    expect(features).toContain("Post a daily update");
  });

  it("covers every feature of the index, or says why not", () => {
    const missing = features.filter(
      (feature) => !covered.has(feature) && !(feature in NOT_IN_TOUR),
    );
    expect(missing).toEqual([]);
  });

  it("names only features that are in the index", () => {
    const unknown = [...covered, ...Object.keys(NOT_IN_TOUR)].filter(
      (feature) => !features.includes(feature),
    );
    expect(unknown).toEqual([]);
  });

  it("leaves a feature out only with a reason, and never one it also shows", () => {
    for (const [feature, reason] of Object.entries(NOT_IN_TOUR)) {
      expect(reason.length).toBeGreaterThan(20);
      expect(covered.has(feature)).toBe(false);
    }
  });
});

describe("every role capability has a step", () => {
  const { bullets, admins } = roleCapabilities();
  const ids = new Set(STEPS.map((step) => step.id));

  it("reads the requirements' role list", () => {
    expect(bullets.filter((b) => b.role === "member")).toHaveLength(7);
    expect(bullets.filter((b) => b.role === "manager")).toHaveLength(7);
  });

  it("maps each member and manager bullet to steps", () => {
    for (const bullet of bullets) {
      const match = CAPABILITIES.find(
        (c) => c.role === bullet.role && bullet.text.startsWith(c.text),
      );
      expect(match, bullet.text).toBeDefined();
    }
  });

  it("maps each admin-only power to steps", () => {
    for (const c of CAPABILITIES.filter((c) => c.role === "admin")) {
      expect(admins).toContain(c.text);
    }
  });

  it("shows each capability in the chapter of the lowest role that has it", () => {
    for (const c of CAPABILITIES) {
      expect(c.steps.length).toBeGreaterThan(0);
      for (const id of c.steps) {
        expect(ids.has(id), id).toBe(true);
        const step = STEPS.find((s) => s.id === id);
        expect(step.audience, id).toBe(ROLE_AUDIENCE[c.role]);
      }
    }
  });
});

describe("the steps", () => {
  it("are complete, with unique ids, in chapter order", () => {
    const ids = STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    const order = CHAPTERS.map((c) => c.id);
    let last = 0;
    for (const step of STEPS) {
      expect(AUDIENCES[step.audience], step.id).toBeDefined();
      expect(PERSONAS[step.as], step.id).toBeDefined();
      const chapter = order.indexOf(step.chapter);
      expect(chapter, step.id).toBeGreaterThanOrEqual(last);
      last = chapter;
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
      expect(step.route, step.id).toBeDefined();
      expect(step.target, step.id).toBeDefined();
      for (const name of step.prepare ?? [])
        expect(SETUP[name], name).toBeDefined();
      if (step.action) {
        expect(typeof step.action.until).toBe("function");
        expect(typeof step.action.doIt).toBe("function");
        expect(step.action.hint).toBeTruthy();
      }
    }
  });

  it("open every chapter by saying who it is about, as that chapter's person", () => {
    for (const chapter of CHAPTERS) {
      const first = STEPS.find((step) => step.chapter === chapter.id);
      expect(first.as).toBe(chapter.as);
    }
    expect(STEPS.find((s) => s.id === "admin-start").body).toContain(
      "Admins can do everything managers and members can.",
    );
    expect(STEPS.find((s) => s.id === "member-start").body).toContain(
      "Everyone posts daily updates, managers and admins included.",
    );
    expect(STEPS.find((s) => s.id === "manager-start").body).toContain(
      "Managers can do everything members can. Admins can do everything here too.",
    );
    expect(STEPS.find((s) => s.id === "review-desk").body).toContain(
      "Nobody reviews their own report",
    );
  });

  it("speak the product's language: sentence case, no exclamation marks, no pronouns", () => {
    const ctx = { ...tourContext(createDemoStore()), memo: { day: "tue" } };
    const text = (value) => (typeof value === "function" ? value(ctx) : value);
    for (const step of STEPS) {
      const texts = [
        step.title,
        step.body,
        step.action?.hint,
        text(step.action?.done?.title),
        text(step.action?.done?.body),
      ].filter(Boolean);
      for (const text of texts) {
        expect(text, step.id).not.toContain("!");
        expect(text, step.id).not.toMatch(/\b(he|she|him|her|his|hers)\b/i);
      }
      // Sentence case: no capital after the first word, except names and UI words.
      const words = step.title.split(" ").slice(1);
      for (const word of words) {
        if (/^[A-Z]/.test(word)) {
          expect(
            ["Imali’s", "Imali", "Nadia", "Sanduni", "Updates", "Ctrl+P"],
            `${step.id}: ${word}`,
          ).toContain(word);
        }
      }
    }
  });

  it("give an honest length: every step read, every action done by hand", () => {
    const actions = STEPS.filter((step) => step.action).length;
    const seconds = (STEPS.length - actions) * 9 + actions * 30;
    expect(tourMinutes()).toBe(Math.round(seconds / 60));
    expect(tourMinutes()).toBeGreaterThanOrEqual(10);
  });
});

// ---------------------------------------------------------------- actions

describe("an action step (owner feedback on PR #28)", () => {
  const actions = STEPS.filter((step) => step.action);
  const ctx = { ...tourContext(createDemoStore()), memo: { day: "tue" } };
  const text = (value) => (typeof value === "function" ? value(ctx) : value);

  it("says what changed once it's done, and where", () => {
    expect(actions).toHaveLength(11);
    for (const { id, action } of actions) {
      expect(action.done, id).toBeDefined();
      expect(text(action.done.title).length, id).toBeGreaterThan(0);
      expect(text(action.done.body), id).toMatch(/^Done\. /);
      expect(text(action.done.body).length, id).toBeLessThan(220);
      expect(action.done.target, id).toBeDefined();
    }
    const post = STEPS.find((s) => s.id === "post").action.done;
    expect(text(post.body)).toBe(
      "Done. Imali’s Tuesday update is posted, and its square on the strip is now filled.",
    );
    expect(text(post.target)).toBe(
      '[data-tour="strip-day"][data-tour-id="tue"]',
    );
  });

  const index = STEPS.findIndex((s) => s.id === "post");
  const shown = (state) =>
    reducer(state, { type: "phase", run: state.run, phase: "shown" });
  const atPost = () => shown(reducer(INITIAL, { type: "start", index }));

  it("stays on its step after Do it for me, until Next", () => {
    let state = atPost();
    state = reducer(state, { type: "do", run: state.run });
    expect(state.outcome).toBe("doing");
    state = reducer(state, { type: "happened", run: state.run });
    state = reducer(state, { type: "done", run: state.run });
    expect(state).toMatchObject({ index, outcome: "done", phase: "shown" });
    state = reducer(state, { type: "go", index: index + 1 });
    expect(state).toMatchObject({ index: index + 1, outcome: null });
  });

  it("stays on its step when the visitor does it, until Next", () => {
    let state = atPost();
    const run = state.run;
    state = reducer(state, { type: "happened", run });
    expect(state).toMatchObject({ index, outcome: "doing" });
    state = reducer(state, { type: "done", run });
    expect(state).toMatchObject({ index, outcome: "done" });
    // Nothing but the visitor moves the tour: no other action changes the step.
    for (const type of ["do", "happened", "done", "failed", "phase", "panel"]) {
      expect(reducer(state, { type, run, phase: "shown" }).index).toBe(index);
    }
  });

  it("holds Back, Next and a second press while it runs; Exit still works", () => {
    let state = atPost();
    state = reducer(state, { type: "do", run: state.run });
    expect(reducer(state, { type: "go", index: index + 1 })).toBe(state);
    expect(reducer(state, { type: "go", index: index - 1 })).toBe(state);
    expect(reducer(state, { type: "do", run: state.run })).toBe(state);
    expect(reducer(state, { type: "exit", keep: true })).toMatchObject({
      mode: "off",
      outcome: null,
      resume: index,
    });
  });

  it("ignores what a step it has left reports, and lets the visitor try again after a failure", () => {
    let state = atPost();
    const old = state.run;
    state = reducer(state, { type: "do", run: old });
    state = reducer(state, { type: "failed", run: old });
    expect(state.outcome).toBeNull();
    state = reducer(state, { type: "go", index: index + 1 });
    expect(reducer(state, { type: "done", run: old })).toBe(state);
    expect(reducer(state, { type: "happened", run: old })).toBe(state);
  });

  it("is moved on only by Back and Next in the layer: no timer, no watcher", () => {
    const layer = readFileSync(
      new URL("../tour/TourLayer.jsx", import.meta.url),
      "utf8",
    );
    expect(layer.match(/type: "go"/g)).toHaveLength(1); // the `go` helper
    expect(layer.match(/\bgo\(/g)).toHaveLength(2); // Back and Next
    expect(layer).toContain("onBack={() => go(state.index - 1)}");
    expect(layer).toContain("onNext={() => go(state.index + 1)}");
  });
});

// ---------------------------------------------------------------- targets

const sources = import.meta.glob(
  ["../../**/*.{js,jsx}", "!../../**/__tests__/**", "!../../demo/tour/**"],
  { query: "?raw", import: "default", eager: true },
);
const allSource = Object.values(sources).join("\n");
const sourceOf = (path) =>
  Object.entries(sources).find(([file]) => file.endsWith(path))[1];

/** Is `name` given as a `data-tour` somewhere in the app? */
function isTargetInSource(name) {
  if (name.startsWith("nav:")) {
    return (
      sourceOf("shell/SidebarNavItem.jsx").includes(
        "data-tour={`nav:${to}`}",
      ) && sourceOf("shell/navItems.js").includes(`to: "${name.slice(4)}"`)
    );
  }
  if (name.startsWith("form-")) {
    return (
      sourceOf("report/FormSection.jsx").includes("data-tour={id}") &&
      sourceOf("report/ReportForm.jsx").includes(`id: "${name}"`)
    );
  }
  if (name.startsWith("menu-")) {
    return (
      sourceOf("user/UsersTable.jsx").includes("tour: `menu-${kind}`") &&
      sourceOf("user/UsersTable.jsx").includes(`"${name.slice(5)}"`)
    );
  }
  return (
    allSource.includes(`data-tour="${name}"`) ||
    allSource.includes(`tour="${name}"`) ||
    new RegExp(`data-tour=\\{[^}]*"${name}"`).test(allSource)
  );
}

describe("every step points at a target the app has", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 14, 10, 0)); // a Wednesday
  });
  afterEach(() => vi.useRealTimers());

  it("finds each `data-tour` name in the components", () => {
    const store = createDemoStore();
    const ctx = { ...tourContext(store), path: "/", memo: {}, since: 0 };
    const names = new Set();
    for (const step of STEPS) {
      const targets = [step.target, step.action?.done?.target]
        .filter(Boolean)
        .flatMap((t) => (typeof t === "function" ? t(ctx) : t));
      for (const selector of targets) {
        for (const [, name] of selector.matchAll(/data-tour="([^"]+)"/g)) {
          names.add(name);
        }
      }
    }
    expect(names.size).toBeGreaterThan(40);
    const absent = [...names].filter((name) => !isTargetInSource(name));
    expect(absent).toEqual([]);
  });

  it("marks targets with inert attributes only — no page reads the tour", () => {
    for (const [file, text] of Object.entries(sources)) {
      if (file.includes("/demo/") || file.endsWith("DemoEntryPage.jsx"))
        continue;
      if (file.endsWith("RootLayout.jsx")) {
        // The one way in: a dynamic import, so the tour is a chunk of its own.
        expect(text).toContain('import("../demo/tour/TourLayer.jsx")');
        expect(text).not.toMatch(/^import .*demo\/tour/m);
        continue;
      }
      expect(text, file).not.toMatch(/(from\s+|import\()["'][^"']*demo\/tour/);
    }
  });
});

// ---------------------------------------------------------------- the setup helpers

function asUser(store, userId, method, url, query = {}) {
  const before = store.session.userId;
  store.session.userId = userId;
  try {
    const route = matchRoute(method, url);
    return route.handler(store, { params: route.params, query, body: {} });
  } finally {
    store.session.userId = before;
  }
}

describe.each([
  ["a Monday", new Date(2026, 9, 12, 9, 0)],
  ["a Wednesday", new Date(2026, 9, 14, 10, 0)],
  ["a Saturday", new Date(2026, 9, 17, 11, 0)],
])("the setup helpers, on %s", (_, now) => {
  let store;
  const ctx = () => tourContext(store);
  const story = () =>
    store.reports.find(
      (r) => r.author === CAST.imali && r.weekKey === ctx().lastWeek,
    );

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    store = createDemoStore();
  });
  afterEach(() => vi.useRealTimers());

  it("walk the story week through every status, each only once", () => {
    expect(story().status).toBe("needs_correction"); // the sample data
    expect(prepare(store, ["storyDraft"])).toBe(true);
    expect(story()).toMatchObject({ status: "draft", revisionNumber: 0 });
    expect(story().content.tasks.every((t) => t.status === null)).toBe(true);
    expect(prepare(store, ["storyDraft"])).toBe(false);

    expect(prepare(store, ["storySubmitted"])).toBe(true);
    expect(story()).toMatchObject({
      status: "submitted",
      approvalRequested: true,
      revisionNumber: 1,
    });
    // It really is on Nadia's review desk.
    const desk = asUser(store, CAST.nadia, "get", "/review-desk", {
      approval: "requested",
    });
    expect(desk.data.items.map((r) => r._id)).toContain(story()._id);
    expect(prepare(store, ["storySubmitted"])).toBe(false);

    expect(prepare(store, ["storySentBack"])).toBe(true);
    expect(story().status).toBe("needs_correction");
    expect(story().latestComment.author).toBe(CAST.nadia);
    expect(prepare(store, ["storySentBack"])).toBe(false);

    expect(prepare(store, ["storyResubmitted"])).toBe(true);
    expect(story()).toMatchObject({ status: "submitted", revisionNumber: 2 });
    expect(prepare(store, ["storyResubmitted"])).toBe(false);

    expect(prepare(store, ["storyApproved"])).toBe(true);
    expect(story().status).toBe("approved");
    expect(prepare(store, ["storyApproved"])).toBe(false);
  });

  it("reach any status straight from the sample data, as a jump does", () => {
    for (const [name, status] of [
      ["storySubmitted", "submitted"],
      ["storySentBack", "needs_correction"],
      ["storyResubmitted", "submitted"],
      ["storyApproved", "approved"],
    ]) {
      store = createDemoStore();
      prepare(store, [name]);
      expect(story().status, name).toBe(status);
    }
    store = createDemoStore();
    prepare(store, ["storyApproved"]);
    prepare(store, ["storySentBack"]); // back from Approved: a fresh week
    expect(story().status).toBe("needs_correction");
  });

  it("give Imali a day to post, keep it once posted, and one to edit", () => {
    prepare(store, ["imaliCanPost"]);
    const open = ctx().openDay;
    expect(WEEKDAYS).toContain(open);
    const posted = asUser(
      store,
      CAST.imali,
      "put",
      `/reports/week/${ctx().thisWeek}/days/${open}`,
    );
    // An empty body is refused: the day really is writable, just not filled in.
    expect(posted.error.code).toBe("VALIDATION_FAILED");

    store = createDemoStore();
    prepare(store, ["imaliHasPosted"]);
    expect(ctx().postedDay).not.toBeNull();
    const before = store.reports.find(
      (r) => r.author === CAST.imali && r.weekKey === ctx().thisWeek,
    ).days.length;
    prepare(store, ["imaliHasPosted"]);
    expect(
      store.reports.find(
        (r) => r.author === CAST.imali && r.weekKey === ctx().thisWeek,
      ).days.length,
    ).toBe(before);
  });

  it("open Ayesha's day to the team, so Imali may comment, and leave a comment to edit", () => {
    prepare(store, ["teamDayOpen"]);
    const { teamDay, thisWeek } = ctx();
    const feed = asUser(store, CAST.imali, "get", "/updates", {
      weekKey: thisWeek,
      weekday: teamDay,
    });
    const ayesha = feed.data.items.find((e) => e.user._id === CAST.ayesha);
    expect(ayesha.day.openToTeam).toBe(true);
    expect(ayesha.day.canComment).toBe(true);

    prepare(store, ["imaliTeamComment"]);
    const again = asUser(store, CAST.imali, "get", "/updates", {
      weekKey: thisWeek,
      weekday: teamDay,
    });
    const thread = again.data.items
      .find((e) => e.user._id === CAST.ayesha)
      .day.comments.find((t) => t.author._id === CAST.imali);
    expect(new Date(thread.editableUntil).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it("find a free email for each invite", () => {
    expect(freeInviteEmail(store)).toBe("new.colleague@example.com");
    store.users.push({ email: "new.colleague@example.com" });
    expect(freeInviteEmail(store)).toBe("new.colleague2@example.com");
  });
});

// ---------------------------------------------------------------- placement

describe("where the tooltip goes", () => {
  const view = { width: 1440, height: 900 };
  const tip = { width: 360, height: 220 };

  it("sits below, above, to the right or left — the first with room", () => {
    const small = { top: 100, left: 600, width: 100, height: 40 };
    expect(placeTooltip(small, tip, view).side).toBe("bottom");
    const low = { top: 800, left: 600, width: 100, height: 40 };
    expect(placeTooltip(low, tip, view).side).toBe("top");
    const tall = { top: 20, left: 20, width: 400, height: 860 };
    expect(placeTooltip(tall, tip, view).side).toBe("right");
    const full = { top: 0, left: 0, width: 1440, height: 900 };
    expect(placeTooltip(full, tip, view).side).toBe("corner");
  });

  it("tries a step's own side first, and never leaves the screen", () => {
    const menu = { top: 400, left: 1350, width: 40, height: 40 };
    const placed = placeTooltip(menu, tip, view, "top");
    expect(placed.side).toBe("top");
    expect(placed.left + tip.width).toBeLessThanOrEqual(view.width - 12);
    expect(placed.top + tip.height).toBeLessThanOrEqual(menu.top);
  });

  it("leaves the demo bar across the top in reach", () => {
    const nearTop = { top: 250, left: 600, width: 100, height: 560 };
    expect(placeTooltip(nearTop, tip, view, "top", 0).side).toBe("top");
    expect(placeTooltip(nearTop, tip, view, "top", 36).side).not.toBe("top");
    const side = placeTooltip(
      { top: 40, left: 20, width: 200, height: 40 },
      tip,
      view,
      "right",
      36,
    );
    expect(side.top).toBeGreaterThanOrEqual(36 + 12);
  });

  it("centres with no target, and pads and clamps the highlight", () => {
    expect(placeTooltip(null, tip, view).side).toBe("center");
    expect(padRect({ top: 10, left: 10, width: 10, height: 10 }, 6)).toEqual({
      top: 4,
      left: 4,
      width: 22,
      height: 22,
    });
    expect(
      withinView({ top: -5, left: 0, width: 1440, height: 950 }, view),
    ).toEqual({ top: 1, left: 1, width: 1438, height: 898 });
  });

  it("never draws a scrolled target's outline across the sticky bars", () => {
    const section = { top: 20, left: 510, width: 904, height: 500 };
    expect(clipBelow(section, 98)).toEqual({
      top: 98,
      left: 510,
      width: 904,
      height: 422,
    });
    const below = { top: 120, left: 0, width: 10, height: 10 };
    expect(clipBelow(below, 98)).toBe(below);
    expect(clipBelow(null, 98)).toBeNull();
  });

  it("scrolls a target up to make room below it, when both fit", () => {
    const composer = { top: 400, left: 270, width: 1140, height: 400 };
    expect(roomBelow(composer, tip, view, 98)).toBe(400 - 110);
    const ready = { top: 120, left: 270, width: 400, height: 100 };
    expect(roomBelow(ready, tip, view, 98)).toBe(0);
    const huge = { top: 120, left: 270, width: 400, height: 700 };
    expect(roomBelow(huge, tip, view, 98)).toBeNull();
  });
});

describe("the phone's sheet", () => {
  const view = { width: 360, height: 780 };
  const sheet = 220;
  const page = { safeTop: 98, scroll: 600, maxScroll: 2000 };

  it("goes at the bottom, scrolling the target above it", () => {
    const low = { top: 700, left: 16, width: 300, height: 60 };
    const plan = planSheet(low, sheet, view, page);
    expect(plan.side).toBe("bottom");
    expect(low.top - plan.delta + low.height).toBeLessThanOrEqual(
      view.height - sheet,
    );
  });

  it("goes at the top when the target can't move above it", () => {
    const pinnedBar = { top: 700, left: 0, width: 360, height: 80 };
    expect(
      planSheet(pinnedBar, sheet, view, { ...page, pinned: true }),
    ).toEqual({
      side: "top",
      delta: 0,
    });
    const pageEnd = { top: 640, left: 16, width: 300, height: 100 };
    expect(
      planSheet(pageEnd, sheet, view, { ...page, scroll: 2000 }).side,
    ).toBe("top");
  });

  it("puts a top sheet under the demo bar, and keeps the target below both", () => {
    const pinnedBar = { top: 700, left: 0, width: 360, height: 80 };
    const plan = planSheet(pinnedBar, sheet, view, {
      ...page,
      pinned: true,
      offset: 36,
    });
    expect(plan.side).toBe("top");
    const tooHigh = { top: 230, left: 0, width: 360, height: 600 };
    expect(
      planSheet(tooHigh, sheet, view, { ...page, pinned: true, offset: 36 })
        .side,
    ).toBe("bottom");
    expect(
      clipToOpenArea(
        { top: 100, left: 0, width: 300, height: 400 },
        { side: "top", height: sheet, offset: 36 },
        view,
      ).top,
    ).toBe(256);
  });

  it("shows the top of a target taller than the room, and never covers it", () => {
    const tall = { top: 300, left: 16, width: 300, height: 900 };
    const plan = planSheet(tall, sheet, view, page);
    expect(plan.side).toBe("bottom");
    const moved = { ...tall, top: tall.top - plan.delta };
    const shown = clipToOpenArea(
      moved,
      { side: "bottom", height: sheet },
      view,
    );
    expect(shown.top + shown.height).toBeLessThanOrEqual(view.height - sheet);
  });
});
