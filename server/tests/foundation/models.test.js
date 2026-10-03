import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { Holiday } from "../../src/models/holidayModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Revision } from "../../src/models/revisionModel.js";
import { User } from "../../src/models/userModel.js";

// Schema-level validation only; behaviour belongs to the services and their tests.
const id = () => new mongoose.Types.ObjectId();
const line = (hours = 2) => ({
  task: id(),
  project: id(),
  taskType: "development",
  text: "Did it",
  hours,
});
const day = (weekday, blockers = []) => ({
  weekday,
  lines: [line()],
  blockers,
  postedAt: new Date(),
});
const report = (days) =>
  new Report({
    author: id(),
    weekKey: "2026-W38",
    weekStart: new Date("2026-09-14"),
    weekEnd: new Date("2026-09-18"),
    days,
  });
const errorsOf = async (doc) =>
  (
    await doc.validate().then(
      () => null,
      (e) => e,
    )
  )?.errors ?? {};

describe("models", () => {
  it("lets an invited user have no name, but not an active one", async () => {
    expect(
      await errorsOf(new User({ email: "a@example.com", status: "invited" })),
    ).toEqual({});
    expect(
      Object.keys(await errorsOf(new User({ email: "a@example.com" }))),
    ).toEqual(["name"]);
  });

  it("strips the hash, link token and token version from toJSON", () => {
    const json = new User({
      name: "A",
      email: "a@example.com",
      passwordHash: "h",
      linkTokenHash: "t",
    }).toJSON();
    expect(json).not.toHaveProperty("passwordHash");
    expect(json).not.toHaveProperty("linkTokenHash");
    expect(json).not.toHaveProperty("tokenVersion");
    expect(json).toHaveProperty("_id");
  });

  it("gives a new report an empty content body and Draft status", () => {
    const r = report([]);
    expect(r.status).toBe("draft");
    expect(r.content.toObject()).toEqual({
      tasks: [],
      nextWeek: [],
      achievements: [],
      notes: "",
      links: [],
    });
  });

  it("accepts quarter hours and refuses anything else", async () => {
    expect(
      await errorsOf(report([{ ...day("mon"), lines: [line(1.25)] }])),
    ).toEqual({});
    expect(
      Object.keys(
        await errorsOf(report([{ ...day("mon"), lines: [line(1.1)] }])),
      ),
    ).toContain("days.0.lines.0.hours");
    expect(
      Object.keys(
        await errorsOf(report([{ ...day("mon"), lines: [line(0)] }])),
      ),
    ).toContain("days.0.lines.0.hours");
  });

  it("needs at least one line on a day", async () => {
    expect(
      Object.keys(await errorsOf(report([{ ...day("mon"), lines: [] }]))),
    ).toContain("days.0.lines");
  });

  it("allows one entry per weekday and one key blocker across the week", async () => {
    expect(
      Object.keys(await errorsOf(report([day("mon"), day("mon")]))),
    ).toContain("days");
    const key = { text: "Waiting on keys", isKey: true };
    expect(await errorsOf(report([day("mon", [key]), day("tue")]))).toEqual({});
    expect(
      Object.keys(
        await errorsOf(report([day("mon", [key]), day("tue", [key])])),
      ),
    ).toContain("days");
  });

  it("allows at most one key achievement", async () => {
    const r = report([]);
    r.content.achievements = [
      { text: "a", isKey: true },
      { text: "b", isKey: true },
    ];
    expect(Object.keys(await errorsOf(r))).toContain("content.achievements");
  });

  it("keeps blocker and line ids, and no id on a day", () => {
    const d = report([day("mon", [{ text: "x" }])]).days[0];
    expect(d._id).toBeUndefined();
    expect(d.lines[0]._id).toBeDefined();
    expect(d.blockers[0]._id).toBeDefined();
  });

  it("stores revision days without comments", () => {
    const rev = new Revision({
      report: id(),
      revisionNumber: 1,
      content: {},
      submittedAt: new Date(),
      submittedBy: id(),
      days: [
        {
          ...day("mon"),
          comments: [{ author: id(), text: "hi", createdAt: new Date() }],
        },
      ],
    });
    expect(rev.days[0].toObject()).not.toHaveProperty("comments");
  });

  it("needs a send-back comment of at least 10 characters", async () => {
    const base = {
      report: id(),
      revisionNumber: 1,
      content: {},
      submittedAt: new Date(),
      submittedBy: id(),
    };
    expect(await errorsOf(new Revision(base))).toEqual({});
    expect(
      Object.keys(
        await errorsOf(new Revision({ ...base, action: "changes_requested" })),
      ),
    ).toEqual(["comment"]);
    expect(
      Object.keys(
        await errorsOf(
          new Revision({
            ...base,
            action: "changes_requested",
            comment: "too short",
          }),
        ),
      ),
    ).toEqual(["comment"]);
    expect(
      await errorsOf(
        new Revision({
          ...base,
          action: "changes_requested",
          comment: "Hours look off.",
        }),
      ),
    ).toEqual({});
  });

  it("puts holidays on a weekday at UTC midnight", async () => {
    const h = (date) => new Holiday({ date, name: "Poya", createdBy: id() });
    expect(await errorsOf(h("2026-09-16"))).toEqual({});
    expect(Object.keys(await errorsOf(h("2026-09-19")))).toEqual(["date"]); // Saturday
    expect(Object.keys(await errorsOf(h("2026-09-16T05:30:00Z")))).toEqual([
      "date",
    ]);
  });
});
