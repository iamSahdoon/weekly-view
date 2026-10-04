import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { WEEKDAYS } from "../constants/weekdays.js";
import * as calendar from "../services/calendarService.js";
import {
  shiftWeek,
  toDateString,
  weekEndOf,
  weekKeyOf,
  weekStartOf,
  weekdayDate,
} from "../utils/weeks.js";

// The development dataset (database_schema.md §8, tech_stack.md §6.8): hand-authored
// arrays and index arithmetic, no faker, no randomness — the same `now` always yields the
// same documents, ids included. Everything is placed relative to the week `now` falls in,
// so a reseed always has a populated current week holding every week state. Timestamps of
// the current week follow its working days, so some are later than the moment of seeding.
//
// Weeks are numbered k = 0 … 5, five weeks back to the current week; week −6 is a Holiday
// week with nothing in it. Dev and tests only — the public demo never reads this.

export const PASSWORD = "weekly-view-dev";
// A fixed salt keeps even the hash identical between reseeds.
const SALT = "$2b$10$weeklyviewdevseedsalt.";
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const WEEKS = 6; // k = 0 … 5, the last being the current week
const CURRENT = WEEKS - 1;

const KIND = {
  user: "a1",
  project: "b1",
  task: "c1",
  report: "d1",
  revision: "e1",
  holiday: "f1",
  mark: "a2",
  sub: "b2", // lines, blockers, threads, replies, achievements
};

function idFactory() {
  const counters = {};
  return (kind) => {
    counters[kind] = (counters[kind] ?? 0) + 1;
    return new mongoose.Types.ObjectId(
      KIND[kind] + String(counters[kind]).padStart(22, "0"),
    );
  };
}

// ---------------------------------------------------------------- the fixed cast

// First name + initial (brand_design_strategy.md §10). The first admin is the owner.
const CAST = [
  { key: "sanduni", name: "Sanduni B.", role: "admin", owner: true },
  { key: "nadia", name: "Nadia F.", role: "manager" },
  { key: "ruwan", name: "Ruwan P.", role: "manager" },
  { key: "imali", name: "Imali J.", role: "member" },
  { key: "tharindu", name: "Tharindu S.", role: "member" },
  { key: "ayesha", name: "Ayesha C.", role: "member" },
  { key: "dinesh", name: "Dinesh K.", role: "member" },
  { key: "malith", name: "Malith W.", role: "member" },
];
// A removed person (closed period mid-history) and a re-hired one (two periods, a gap).
const REMOVED = { key: "chamari", name: "Chamari L.", role: "member" };
const REHIRED = { key: "lakmal", name: "Lakmal H.", role: "member" };
const INVITED = { key: "invitee", name: "", role: "member" };

const ASSIGNED = {
  sanduni: ["clientA", "tooling"],
  nadia: ["clientA", "rnd"],
  ruwan: ["clientA", "tooling"],
  imali: ["rnd", "clientA", "tooling"],
  tharindu: ["tooling"],
  ayesha: ["clientA"],
  dinesh: ["rnd", "tooling"],
  malith: ["clientA", "tooling", "marketing"],
  chamari: ["rnd", "legacy"],
  lakmal: ["clientA", "tooling"],
  invitee: ["clientA"],
};

// ---------------------------------------------------------------- work, as tasks

// `weeks: [from, to]` are k values. A task is *long* when it spans three or more weeks.
// `done` means its status is Done in the last week it is reported; otherwise it stays open.
const TASKS = {
  sanduni: [
    {
      name: "Roll out access reviews",
      project: "tooling",
      type: "development",
      weeks: [0, 3],
      done: true,
    },
    {
      name: "Audit trail export",
      project: "tooling",
      type: "development",
      weeks: [3, 5],
    },
    {
      name: "Vendor invoice sign-off",
      project: "clientA",
      type: "other",
      weeks: [5, 5],
      done: true,
    },
  ],
  nadia: [
    {
      name: "Client roadmap review",
      project: "clientA",
      type: "meetings",
      weeks: [1, 5],
    },
    {
      name: "Hiring panel prep",
      project: "tooling",
      type: "other",
      weeks: [0, 0],
      done: true,
    },
  ],
  ruwan: [
    {
      name: "Checkout redesign",
      project: "clientA",
      type: "development",
      weeks: [0, 3],
      done: true,
    },
    {
      name: "Payments hardening",
      project: "clientA",
      type: "development",
      weeks: [3, 5],
    },
    {
      name: "Spike: queue tuning",
      project: "rnd",
      type: "research_study",
      weeks: [5, 5],
      done: true,
    },
  ],
  imali: [
    {
      name: "Search relevance",
      project: "rnd",
      type: "research_study",
      weeks: [0, 5],
    },
    {
      name: "Fix typeahead crash",
      project: "clientA",
      type: "development",
      weeks: [1, 1],
      done: true,
    },
    {
      name: "Docs refresh",
      project: "tooling",
      type: "documentation",
      weeks: [5, 5],
      done: true,
    },
  ],
  tharindu: [
    {
      name: "Reporting API",
      project: "tooling",
      type: "development",
      weeks: [0, 2],
      done: true,
    },
    {
      name: "Export to CSV",
      project: "tooling",
      type: "development",
      weeks: [2, 5],
    },
    {
      name: "Rotate staging keys",
      project: "tooling",
      type: "other",
      weeks: [4, 4],
      done: true,
    },
  ],
  ayesha: [
    {
      name: "Design tokens",
      project: "clientA",
      type: "development",
      weeks: [0, 3],
      done: true,
    },
    {
      name: "Dashboard charts",
      project: "clientA",
      type: "development",
      weeks: [3, 5],
    },
    {
      name: "Icon audit",
      project: "clientA",
      type: "review",
      weeks: [1, 1],
      done: true,
    },
  ],
  dinesh: [
    {
      name: "Data migration",
      project: "rnd",
      type: "development",
      weeks: [0, 3],
      done: true,
    },
    {
      name: "Pipeline monitoring",
      project: "rnd",
      type: "testing",
      weeks: [3, 4],
    },
    {
      name: "Fix flaky import",
      project: "tooling",
      type: "testing",
      weeks: [1, 1],
      done: true,
    },
  ],
  malith: [
    {
      name: "Mobile onboarding",
      project: "clientA",
      type: "development",
      weeks: [0, 4],
      done: true,
    },
    {
      name: "Release checklist",
      project: "tooling",
      type: "documentation",
      weeks: [1, 4],
    },
    {
      name: "Archive legacy exports",
      project: "legacy",
      type: "other",
      weeks: [0, 0],
      done: true,
    },
    {
      name: "Retire old reports",
      project: "legacy",
      type: "other",
      weeks: [1, 1],
      done: true,
    },
  ],
  chamari: [
    {
      name: "Bulk import tool",
      project: "rnd",
      type: "development",
      weeks: [0, 1],
      done: true,
    },
    {
      name: "Close vendor accounts",
      project: "legacy",
      type: "other",
      weeks: [0, 0],
      done: true,
    },
  ],
  lakmal: [
    {
      name: "Billing sync",
      project: "clientA",
      type: "development",
      weeks: [0, 1],
      done: true,
    },
    {
      name: "Invoice export",
      project: "clientA",
      type: "development",
      weeks: [4, 5],
    },
  ],
};

const LINE_TEXT = {
  development: [
    "Wired the endpoint to the new form",
    "Refactored the loader and removed the duplicate query",
    "Built the first pass and pushed it for review",
  ],
  testing: [
    "Wrote regression tests for the failing cases",
    "Ran the full suite against staging",
    "Checked edge cases around empty weeks",
  ],
  meetings: [
    "Planning call with the team",
    "Weekly sync and follow-ups",
    "Walked the client through progress",
  ],
  documentation: [
    "Updated the runbook with the new steps",
    "Wrote up the decisions made this week",
    "Tidied the setup notes",
  ],
  review: [
    "Reviewed two pull requests",
    "Gave feedback on the draft designs",
    "Read through the open changes",
  ],
  research_study: [
    "Compared three approaches and noted the trade-offs",
    "Read the vendor's integration guide",
    "Prototyped the ranking change on sample data",
  ],
  other: [
    "Sorted access requests",
    "Handled admin and approvals",
    "Cleared the inbox backlog",
  ],
};
const ALT_TYPES = [
  "meetings",
  "review",
  "testing",
  "documentation",
  "research_study",
  "other",
];

// Hours for a day with 1, 2 or 3 lines; two variants of each, picked by index.
const DAY_SPLITS = {
  1: [[7.5], [8]],
  2: [
    [4, 3.5],
    [3, 4.5],
  ],
  3: [
    [3, 2.5, 2],
    [2.5, 3, 2.25],
  ],
};

const ACHIEVEMENTS = [
  "Shipped the first version to staging",
  "Closed the long-running review backlog",
  "Cut the page load time noticeably",
  "Agreed the scope with the client",
];
const NEXT_WEEK = [
  "Finish the remaining edge cases",
  "Start on the follow-up review",
  "Hand over the notes to the team",
];
const NOTES = [
  "A steady week.",
  "Slower than planned because of two long meetings.",
  "Most of the time went into one stubborn bug.",
  "",
];

// ---------------------------------------------------------------- explicit scenes

// Blockers by "person:k:weekday". `resolved` rows are marked resolved by Nadia.
const BLOCKERS = {
  "ruwan:5:mon": [{ text: "Staging database refresh is stuck", isKey: false }],
  "tharindu:4:tue": [
    { text: "Waiting on API keys from the client", isKey: true },
  ],
  "tharindu:5:tue": [
    { text: "Waiting on API keys from the client", isKey: true },
  ],
  "ayesha:5:thu": [{ text: "Design review slot not confirmed", isKey: false }],
  "imali:5:thu": [
    {
      text: "Fixtures missing for the ranking tests",
      isKey: false,
      resolved: true,
    },
  ],
  "nadia:3:wed": [
    { text: "Contract wording still with legal", isKey: false, resolved: true },
  ],
  "malith:3:mon": [
    { text: "No access to the production metrics", isKey: false },
  ],
  "ayesha:2:thu": [
    { text: "Figma file locked by another editor", isKey: false },
  ],
};

// The current week: every state, once. `wds` limits a Draft to the days posted so far.
const THIS_WEEK = {
  sanduni: { final: "approved", asked: false, reviewer: "nadia" },
  nadia: { final: "submitted", asked: true },
  ruwan: { final: "submitted", asked: false },
  imali: {
    final: "approved",
    asked: true,
    reviewer: "nadia",
    comment: "Clear, thorough week. Nothing to change.",
    reply: "Thank you.",
  },
  tharindu: {
    final: "needs_correction",
    asked: true,
    reviewer: "ruwan",
    comment:
      "The CSV export task needs a note on what is left before it can be called done.",
  },
  ayesha: { final: "draft", wds: ["mon", "tue", "thu"] },
  lakmal: { final: "draft", wds: ["mon"] },
};

// Weeks a person has no report although they are expected to file: Not started.
const NOT_STARTED = new Set(["malith:2", "malith:5"]);

// ---------------------------------------------------------------- the builder

export function buildDataset(now = new Date()) {
  const nextId = idFactory();
  const currentWeek = weekKeyOf(now);
  const weekKeys = Array.from({ length: WEEKS }, (_, k) =>
    shiftWeek(currentWeek, k - CURRENT),
  );
  const holidayWeek = shiftWeek(currentWeek, -WEEKS); // week −6
  const at = (weekKey, weekday, hours = 0, minutes = 0) =>
    new Date(
      weekdayDate(weekKey, weekday).getTime() + hours * HOUR + minutes * MINUTE,
    );
  const monday = (weekKey) => weekStartOf(weekKey);

  // ---- users
  const passwordHash = bcrypt.hashSync(PASSWORD, SALT);
  const joined = monday(holidayWeek); // the Holiday week, so nobody starts with empty weeks
  const everyone = [...CAST, REMOVED, REHIRED];
  const userIds = {};
  for (const p of [...everyone, INVITED]) userIds[p.key] = nextId("user");

  const periods = {
    chamari: [{ from: joined, to: at(weekKeys[2], "wed", 10) }],
    lakmal: [
      { from: joined, to: at(weekKeys[2], "mon", 9) },
      { from: at(weekKeys[4], "mon", 9), to: null },
    ],
  };
  const leave = {
    dinesh: [
      {
        from: monday(weekKeys[2]),
        to: monday(weekKeys[3]),
        setBy: userIds.nadia,
      },
      { from: monday(weekKeys[CURRENT]), to: null, setBy: userIds.nadia },
    ],
  };

  const projectIds = {
    clientA: nextId("project"),
    tooling: nextId("project"),
    rnd: nextId("project"),
    marketing: nextId("project"),
    legacy: nextId("project"),
  };
  const idsOf = (keys) => keys.map((k) => projectIds[k]);

  const users = everyone.map((p) => ({
    _id: userIds[p.key],
    name: p.name,
    email: `${p.key}@example.com`,
    passwordHash,
    role: p.role,
    projects: idsOf(ASSIGNED[p.key]),
    status: p.key === "chamari" ? "removed" : "active",
    workPeriods: periods[p.key] ?? [{ from: joined, to: null }],
    leave: leave[p.key] ?? [],
    ...(p.owner && { isOwner: true }),
  }));
  // The invited person: no name, no password, a live invite link — attached by the runner,
  // because the raw token must never be written down anywhere.
  users.push({
    _id: userIds.invitee,
    name: INVITED.name,
    email: "invitee@example.com",
    role: INVITED.role,
    projects: idsOf(ASSIGNED.invitee),
    status: "invited",
    workPeriods: [],
    leave: [],
  });
  const userOf = (key) => users.find((u) => u._id === userIds[key]);

  // ---- holidays: Sri Lankan style names; the dates are relative, so they only illustrate
  const holidayDates = [
    [weekKeys[CURRENT], "wed", "Full Moon Poya Day"],
    [weekKeys[4], "mon", "Bank Holiday"],
    [weekKeys[2], "fri", "Sinhala and Tamil New Year Day"],
    ...WEEKDAYS.map((d) => [holidayWeek, d, "Year-end closure"]),
  ];
  const holidays = holidayDates.map(([weekKey, weekday, name]) => ({
    _id: nextId("holiday"),
    date: weekdayDate(weekKey, weekday),
    name,
    createdBy: userIds.sanduni,
  }));
  const holidaysOf = (weekKey) =>
    new Set(
      holidays
        .map((h) => toDateString(h.date))
        .filter(
          (d) =>
            d >= toDateString(weekStartOf(weekKey)) &&
            d <= toDateString(weekEndOf(weekKey)),
        ),
    );

  // ---- projects: on track, overdue, planned hours, future start, extended, inactive
  const plan = (weekKey, plannedDays, plannedHours = null) => ({
    startDate: monday(weekKey),
    plannedDays,
    plannedHours,
  });
  const projects = [
    {
      _id: projectIds.clientA,
      name: "Client A",
      description: "Storefront and billing work for the first client.",
      status: "active",
      plan: plan(weekKeys[3], 20, 900), // on track, with planned hours
    },
    {
      _id: projectIds.tooling,
      name: "Internal Tooling",
      description: "Admin screens and the reporting API.",
      status: "active",
      plan: plan(weekKeys[1], 25), // extended from 15 days
      planHistory: [
        {
          ...plan(weekKeys[1], 15),
          changedAt: at(weekKeys[3], "tue", 11),
          changedBy: userIds.nadia,
        },
      ],
    },
    {
      _id: projectIds.rnd,
      name: "R&D",
      description: "Search and data experiments.",
      status: "active",
      plan: plan(weekKeys[0], 20), // overdue
    },
    {
      _id: projectIds.marketing,
      name: "Marketing",
      description: "Campaign pages and launch material.",
      status: "active",
      plan: plan(shiftWeek(currentWeek, 2), 10), // starts in the future
    },
    {
      _id: projectIds.legacy,
      name: "Legacy Portal",
      description: "Retired. Older tasks still name it.",
      status: "inactive",
      plan: plan(shiftWeek(currentWeek, -9), 30),
    },
  ];

  // ---- which person-weeks have a report, and what happens to it
  const reporters = everyone.map((p) => p.key);
  const reporterIndex = (key) => reporters.indexOf(key);

  function expectedDaysFor(key, weekKey) {
    const holidaysInWeek = holidaysOf(weekKey);
    const workingDays = calendar.workingDaysIn(weekKey, holidaysInWeek);
    return {
      workingDays,
      expectedDays: calendar.expectedDaysOf(userOf(key), weekKey, workingDays),
    };
  }

  /** null — no report; else `{ events, final, wds }`. */
  function planFor(key, k) {
    const weekKey = weekKeys[k];
    const { expectedDays } = expectedDaysFor(key, weekKey);
    if (expectedDays.length === 0 || NOT_STARTED.has(`${key}:${k}`))
      return null;
    const i = reporterIndex(key);
    if (k === CURRENT) {
      const scene = THIS_WEEK[key];
      if (!scene) return null;
      if (scene.final === "draft")
        return { events: [], final: "draft", wds: scene.wds };
      const submittedAt = at(weekKey, "fri", 15, i * 7);
      const event = {
        requested: scene.asked,
        submittedAt,
        action:
          scene.final === "approved"
            ? "approved"
            : scene.final === "needs_correction"
              ? "changes_requested"
              : null,
        reviewer: scene.reviewer,
        comment: scene.comment,
        reply: scene.reply,
        reviewedAt: new Date(submittedAt.getTime() + 2 * HOUR),
      };
      return { events: [event], final: scene.final };
    }
    if (key === "ayesha" && k === 4) return cycleOf(weekKey);
    const lastDay = expectedDays.at(-1);
    const submittedAt = at(weekKey, lastDay, 16, i * 7);
    const reviewer = key === "nadia" ? "ruwan" : "nadia";
    const pattern = (i + k) % 4;
    const reviewed = pattern !== 1;
    return {
      events: [
        {
          requested: pattern === 1 ? i % 2 === 0 : pattern !== 2,
          submittedAt,
          action: reviewed ? "approved" : null,
          reviewer,
          reviewedAt: new Date(submittedAt.getTime() + 20 * HOUR),
        },
      ],
      final: reviewed ? "approved" : "submitted",
    };
  }

  // One complete correction cycle: three revisions, two sent back, the third approved.
  function cycleOf(weekKey) {
    return {
      final: "approved",
      events: [
        {
          requested: true,
          submittedAt: at(weekKey, "wed", 15),
          action: "changes_requested",
          reviewer: "nadia",
          comment:
            "Wednesday's hours by type don't add up to the lines. Please recheck them.",
          reviewedAt: at(weekKey, "thu", 10),
          reply: "Fixed in the next version.",
        },
        {
          requested: true,
          submittedAt: at(weekKey, "thu", 14),
          action: "changes_requested",
          reviewer: "ruwan",
          comment:
            "Better. The Thursday review line still has no matching task note.",
          reviewedAt: at(weekKey, "thu", 17),
        },
        {
          requested: true,
          submittedAt: at(weekKey, "fri", 9, 30),
          action: "approved",
          reviewer: "nadia",
          reviewedAt: at(weekKey, "fri", 15),
        },
      ],
    };
  }

  // ---- tasks (created lazily, in the order the weeks need them)
  const tasks = [];
  const taskDocs = {}; // "person:index" → task document
  for (const key of reporters) {
    (TASKS[key] ?? []).forEach((t, n) => {
      const reportedWeeks = weekKeys
        .map((_, k) => k)
        .filter((k) => planFor(key, k) && k >= t.weeks[0] && k <= t.weeks[1]);
      if (reportedWeeks.length === 0) return;
      const doc = {
        _id: nextId("task"),
        owner: userIds[key],
        name: t.name,
        project: projectIds[t.project],
        doneAt: null,
      };
      taskDocs[`${key}:${n}`] = { doc, template: t, reportedWeeks };
      tasks.push(doc);
    });
  }

  // ---- reports
  const reports = [];
  const revisions = [];
  const reportIds = {};
  const quarter = (h) => Math.round(h * 4) / 4;

  // Line and blocker ids are minted once, so every revision and the live week share them.
  const lineIds = new Map();
  const setLineId = (name) => lineIds.set(name, nextId("sub")).get(name);
  const blockerIds = new Map();
  const setBlockerId = (name) => blockerIds.set(name, nextId("sub")).get(name);

  /** The week's days for `key`, with lines on the tasks active that day. */
  function buildDays(key, k, postedDays, variant) {
    const i = reporterIndex(key);
    const weekKey = weekKeys[k];
    const active = Object.values(taskDocs).filter(
      (t) =>
        t.doc.owner === userIds[key] &&
        k >= t.template.weeks[0] &&
        k <= t.template.weeks[1] &&
        t.reportedWeeks.includes(k),
    );
    const smallDay = postedDays[(k + i) % postedDays.length];
    return postedDays.map((weekday, j) => {
      let today = active.filter((t) =>
        t.template.weeks[0] === t.template.weeks[1]
          ? weekday === smallDay
          : true,
      );
      if (today.length === 0) today = active.slice(0, 1);
      today = today.slice(0, 3);
      const split = DAY_SPLITS[today.length][(i + k + j) % 2];
      const lines = today.map((t, n) => {
        const type =
          (j + n) % 3 === 2
            ? ALT_TYPES[(i + j + k) % ALT_TYPES.length]
            : t.template.type;
        const texts = LINE_TEXT[type];
        // A correction changes the day's first line by half an hour.
        const bump =
          variant > 1 && j === Math.min(2, postedDays.length - 1) && n === 0
            ? 0.5
            : 0;
        return {
          _id:
            lineIds.get(`${key}:${k}:${weekday}:${n}`) ??
            setLineId(`${key}:${k}:${weekday}:${n}`),
          task: t.doc._id,
          project: t.doc.project,
          taskType: type,
          text: texts[(i + j + n + k) % texts.length],
          hours: quarter(split[n] + bump),
        };
      });
      const blockerKey = `${key}:${k}:${weekday}`;
      const blockers = (BLOCKERS[blockerKey] ?? []).map((b, n) => ({
        _id:
          blockerIds.get(`${blockerKey}:${n}`) ??
          setBlockerId(`${blockerKey}:${n}`),
        text: b.text,
        isKey: b.isKey,
      }));
      return {
        weekday,
        lines,
        blockers,
        openToTeam: key === "imali" && k === CURRENT && weekday === "tue",
        postedAt: at(weekKey, weekday, 17, i),
        editedAt: null,
        comments: [],
      };
    });
  }

  /** `content` for the week: a status for every task the lines name. */
  function buildContent(key, k, days, { variant, complete }) {
    const i = reporterIndex(key);
    const named = [
      ...new Set(days.flatMap((d) => d.lines.map((l) => String(l.task)))),
    ];
    const entries = Object.values(taskDocs).filter((t) =>
      named.includes(String(t.doc._id)),
    );
    const tasksOut = entries.map((t, n) => {
      const last = Math.max(
        ...t.reportedWeeks.filter((w) => w <= t.template.weeks[1]),
      );
      let status = "in_progress";
      if (t.template.done && k === last) status = "done";
      else if (
        !t.template.done &&
        k === t.template.weeks[0] + 1 &&
        k < t.template.weeks[1]
      )
        status = "carried_over";
      // A Draft carries statuses only for what the author has got round to.
      if (!complete && n > 0) status = null;
      return {
        task: t.doc._id,
        status,
        note:
          status === "done"
            ? "Finished and handed over."
            : n === 0 && complete
              ? "On track."
              : "",
      };
    });
    return {
      tasks: tasksOut,
      nextWeek: complete ? NEXT_WEEK.slice(0, 1 + ((i + k) % 2)) : [],
      achievements: complete
        ? [
            {
              _id: nextId("sub"),
              text: ACHIEVEMENTS[(i + k) % ACHIEVEMENTS.length],
              isKey: true,
            },
          ]
        : [],
      notes:
        variant > 1
          ? "Corrected the hours by type and added the missing task notes."
          : complete
            ? NOTES[(i + k) % NOTES.length]
            : "",
      links:
        complete && (i + k) % 3 === 0
          ? [
              {
                label: "Pull request",
                url: `https://example.com/pr/${100 + i * 10 + k}`,
              },
            ]
          : [],
    };
  }

  const entry = (key, text, createdAt) => ({
    _id: nextId("sub"),
    author: userIds[key],
    text,
    createdAt,
    editedAt: null,
  });

  for (const key of reporters) {
    for (let k = 0; k < WEEKS; k += 1) {
      const scenario = planFor(key, k);
      if (!scenario) continue;
      const weekKey = weekKeys[k];
      const { expectedDays } = expectedDaysFor(key, weekKey);
      const postedDays = scenario.wds ?? expectedDays;
      const events = scenario.events;
      const reportId = nextId("report");
      reportIds[`${key}:${k}`] = reportId;

      // Revision v holds the days and content as they stood when filed. After a send
      // back the live week is the author's correction in progress, one variant on.
      const revCount = events.length;
      const liveVariant =
        scenario.final === "needs_correction"
          ? revCount + 1
          : Math.max(revCount, 1);
      const variantDays = new Map();
      const daysFor = (v) => {
        if (!variantDays.has(v))
          variantDays.set(v, buildDays(key, k, postedDays, v));
        return variantDays.get(v);
      };
      const complete = scenario.final !== "draft";
      const contents = new Map();
      const contentFor = (v) => {
        if (!contents.has(v))
          contents.set(
            v,
            buildContent(key, k, daysFor(Math.min(v, 2)), {
              variant: Math.min(v, 2),
              complete,
            }),
          );
        return contents.get(v);
      };

      const reviewerId = (e) => userIds[e.reviewer];
      const submitted = events.length > 0;
      const lastEvent = events.at(-1);
      revisions.push(
        ...events.map((e, n) => ({
          _id: nextId("revision"),
          report: reportId,
          revisionNumber: n + 1,
          content: contentFor(n + 1),
          days: daysFor(n + 1).map(({ comments, ...day }) => day), // eslint-disable-line no-unused-vars
          approvalRequested: e.requested,
          submittedAt: e.submittedAt,
          submittedBy: userIds[key],
          action: e.action ?? null,
          ...(e.action && {
            reviewedBy: reviewerId(e),
            reviewedAt: e.reviewedAt,
            ...(e.comment && { comment: e.comment }),
          }),
        })),
      );

      // Live days: deep copies with the comments of the current scene on top.
      const days = daysFor(liveVariant).map((d) => ({ ...d, comments: [] }));
      const dayAt = (weekday) => days.find((d) => d.weekday === weekday);
      const weekComments = [];
      const times = [];
      events.forEach((e, n) => {
        times.push(e.submittedAt);
        if (e.action) times.push(e.reviewedAt);
        if (e.action && e.comment) {
          const thread = {
            ...entry(e.reviewer, e.comment, e.reviewedAt),
            replies: e.reply
              ? [
                  entry(
                    key,
                    e.reply,
                    new Date(e.reviewedAt.getTime() + 20 * MINUTE),
                  ),
                ]
              : [],
            revisionNumber: n + 1,
            kind: e.action === "approved" ? "approval" : "send_back",
          };
          weekComments.push(thread);
        }
      });

      if (k === CURRENT && key === "imali") {
        const tue = dayAt("tue");
        const asked = at(weekKey, "tue", 18, 30);
        tue.comments.push({
          ...entry(
            "ayesha",
            "Do you have the relevance fixtures anywhere I can reuse?",
            asked,
          ),
          replies: [
            entry(
              "imali",
              "Yes, they are in the shared drive under search/fixtures.",
              new Date(asked.getTime() + 25 * MINUTE),
            ),
          ],
        });
        times.push(asked, new Date(asked.getTime() + 25 * MINUTE));
      }
      if (k === CURRENT && key === "ayesha") {
        const mon = dayAt("mon");
        const asked = at(weekKey, "mon", 18);
        mon.comments.push({
          ...entry("nadia", "Could you split this line by project?", asked),
          replies: [
            entry(
              "ayesha",
              "Done, split below.",
              new Date(asked.getTime() + 15 * MINUTE),
            ),
          ],
        });
        times.push(asked, new Date(asked.getTime() + 15 * MINUTE));
      }
      if (k === CURRENT && key === "ruwan") {
        const sent = new Date(lastEvent.submittedAt.getTime() + 3 * HOUR);
        weekComments.push({
          ...entry(
            "nadia",
            "Good week. Can you say more about the queue spike next time?",
            sent,
          ),
          replies: [
            entry("ruwan", "Will do.", new Date(sent.getTime() + 40 * MINUTE)),
          ],
          revisionNumber: 1,
          kind: "comment",
        });
        times.push(sent, new Date(sent.getTime() + 40 * MINUTE));
      }
      for (const t of weekComments) {
        times.push(t.createdAt, ...t.replies.map((r) => r.createdAt));
      }

      const resolutions = days.flatMap((d) =>
        d.blockers.flatMap((b, n) => {
          const spec = (BLOCKERS[`${key}:${k}:${d.weekday}`] ?? [])[n];
          return spec?.resolved
            ? [
                {
                  blockerId: b._id,
                  resolvedAt: new Date(d.postedAt.getTime() + 20 * HOUR),
                  resolvedBy: userIds.nadia,
                },
              ]
            : [];
        }),
      );

      const status = scenario.final;
      const sentBack = status === "needs_correction";
      const content = contentFor(liveVariant);
      reports.push({
        _id: reportId,
        author: userIds[key],
        weekKey,
        weekStart: weekStartOf(weekKey),
        weekEnd: weekEndOf(weekKey),
        status,
        approvalRequested: submitted ? lastEvent.requested : false,
        content,
        days,
        blockerResolutions: resolutions,
        weekComments,
        revisionNumber: revCount,
        ...(submitted && { submittedAt: lastEvent.submittedAt }),
        ...(submitted && {
          lastActivityAt: lastEvent.action
            ? lastEvent.reviewedAt
            : lastEvent.submittedAt,
        }),
        interactionAt:
          times.length > 0
            ? new Date(Math.max(...times.map(Number)))
            : undefined,
        latestComment: sentBack
          ? {
              text: lastEvent.comment,
              author: userIds[lastEvent.reviewer],
              revisionNumber: revCount,
              createdAt: lastEvent.reviewedAt,
            }
          : null,
      });

      // doneAt follows the statuses submitted (taskService.syncDoneAt).
      if (submitted) {
        for (const entryOut of revisions.at(-1).content.tasks) {
          const task = tasks.find((t) => t._id === entryOut.task);
          task.doneAt =
            entryOut.status === "done" ? events[0].submittedAt : null;
        }
      }
    }
  }

  // ---- "new" markers: who has already looked at what
  const marks = [];
  const mark = (user, report, seenAt) =>
    marks.push({
      _id: nextId("mark"),
      user: userIds[user],
      report: reportIds[report],
      seenAt,
    });
  const found = (r) => reports.find((x) => x._id === reportIds[r]);
  // Nadia has read Ruwan's week since it came in; Imali and Tharindu have not seen what
  // happened to theirs, and Ruwan has not opened Nadia's approval request.
  mark(
    "nadia",
    `ruwan:${CURRENT}`,
    new Date(found(`ruwan:${CURRENT}`).interactionAt.getTime() + 5 * MINUTE),
  );
  mark(
    "ruwan",
    `tharindu:${CURRENT}`,
    new Date(found(`tharindu:${CURRENT}`).interactionAt.getTime() + HOUR),
  );
  mark(
    "ayesha",
    "ayesha:4",
    new Date(found("ayesha:4").interactionAt.getTime() + HOUR),
  );
  mark(
    "imali",
    "imali:4",
    new Date(found("imali:4").interactionAt.getTime() + HOUR),
  );
  mark(
    "ruwan",
    `sanduni:${CURRENT}`,
    new Date(found(`sanduni:${CURRENT}`).interactionAt.getTime() + HOUR),
  );

  // Tasks only exist where a report names them; drop the interaction field when unset.
  for (const r of reports)
    if (r.interactionAt === undefined) delete r.interactionAt;

  return {
    currentWeek,
    weekKeys,
    holidayWeek,
    users,
    projects,
    tasks,
    reports,
    revisions,
    holidays,
    seenMarks: marks,
  };
}
