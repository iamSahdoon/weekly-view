import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Revision } from "../../src/models/revisionModel.js";
import { Task } from "../../src/models/taskModel.js";
import {
  buildReportScope,
  canReadContent,
  contentScope,
} from "../../src/policies/reportPolicy.js";
import { weekEndOf, weekStartOf } from "../../src/utils/weeks.js";
import { createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";
import { api, as, freezeAt } from "../helpers/testWeeks.js";

// api_specification.md §6.2 — 9: the list scope and canReadContent agree; 10: no private
// layer leaks. Every author has one report in each status; every private field carries a
// marker naming its layer, so a leak is a substring search. Daily updates are shared and
// carry no marker. V3 (S5) joins both: its rows carry no content field at all, and every
// report it lists is one canReadContent allows.

const WEEKS = {
  draft: "2026-W37",
  submitted: "2026-W38",
  needs_correction: "2026-W39",
  approved: "2026-W40",
};

let people, project;

const actorOf = (user) => ({ id: user._id, role: user.role, isOwner: false });

/** Private content for a layer: `DRAFT`, `FILED` (submitted), `LIVE` (a correction). */
const privateContent = (taskId, tag) => ({
  tasks: [{ task: taskId, status: "done", note: `PRIVATE-${tag}-note` }],
  nextWeek: [`PRIVATE-${tag}-next`],
  achievements: [{ text: `PRIVATE-${tag}-achievement`, isKey: true }],
  notes: `PRIVATE-${tag}-notes`,
  links: [{ label: `PRIVATE-${tag}-link`, url: "https://example.com" }],
});

async function seedReports(author) {
  const task = await Task.create({
    owner: author._id,
    name: "Shared task",
    project: project._id,
  });
  for (const [status, weekKey] of Object.entries(WEEKS)) {
    const days = [
      {
        weekday: "mon",
        postedAt: weekStartOf(weekKey),
        lines: [
          {
            task: task._id,
            project: project._id,
            taskType: "development",
            text: "Shared line",
            hours: 8,
          },
        ],
        blockers: [{ text: "Shared blocker" }],
      },
    ];
    const filed = status !== "draft";
    const report = await Report.create({
      author: author._id,
      weekKey,
      weekStart: weekStartOf(weekKey),
      weekEnd: weekEndOf(weekKey),
      status,
      days,
      revisionNumber: filed ? 1 : 0,
      submittedAt: filed ? new Date("2026-10-01T10:00:00Z") : undefined,
      lastActivityAt: filed ? new Date("2026-10-01T10:00:00Z") : undefined,
      content: privateContent(
        task._id,
        { draft: "DRAFT", needs_correction: "LIVE" }[status] ?? "FILED",
      ),
      weekComments: filed
        ? [
            {
              author: people.managerA._id,
              text: "PRIVATE-WEEKCOMMENT",
              createdAt: new Date("2026-10-01T11:00:00Z"),
              revisionNumber: 1,
              kind: "comment",
            },
          ]
        : [],
    });
    if (filed) {
      await Revision.create({
        report: report._id,
        revisionNumber: 1,
        content: privateContent(task._id, "FILED"),
        days,
        submittedAt: new Date("2026-10-01T10:00:00Z"),
        submittedBy: author._id,
      });
    }
  }
}

beforeEach(async () => {
  await clearDb();
  freezeAt("2026-10-02T12:00:00");
  project = await Project.create({ name: "Client A" });
  people = {
    memberX: await createUser({ name: "Member X.", role: "member" }),
    memberY: await createUser({ name: "Member Y.", role: "member" }),
    managerA: await createUser({ name: "Manager A.", role: "manager" }),
    admin: await createUser({ name: "Admin D.", role: "admin" }),
  };
  for (const author of Object.values(people)) await seedReports(author);
});

afterEach(() => {
  vi.useRealTimers();
});

const idsOf = (rows) => rows.map((r) => String(r._id)).sort();

describe("9 · list scope ↔ canReadContent", () => {
  it.each(["memberX", "managerA", "admin"])(
    "%s: the rows carrying content are exactly what canReadContent allows",
    async (who) => {
      const reader = people[who];
      const actor = actorOf(reader);
      const all = await Report.find().lean();

      // R1 — the reader's own reports: every row carries content.
      let res = await api.get("/api/reports").set(as(reader));
      const own = res.body.data.items;
      expect(own).toHaveLength(4);
      expect(own.every((r) => r.tasksDone !== null)).toBe(true);
      expect(
        own.every((r) =>
          canReadContent(
            actor,
            all.find((x) => String(x._id) === r._id),
          ),
        ),
      ).toBe(true);

      // U7 — every author's history, for those who may call it.
      const rows = [];
      for (const author of Object.values(people)) {
        res = await api
          .get(`/api/users/${author._id}/reports?limit=100`)
          .set(as(reader));
        if (reader.role === "member") {
          expect(res.status).toBe(403);
          continue;
        }
        rows.push(...res.body.data.items.filter((r) => r._id));
      }
      if (reader.role === "member") return;
      const withContent = rows.filter((r) => r.tasksDone !== null);
      const allowed = all.filter((r) => canReadContent(actor, r));
      expect(idsOf(withContent)).toEqual(idsOf(allowed));

      // V3 — the review desk lists only reports whose content the reader may read.
      res = await api
        .get("/api/review-desk?approval=all&limit=100")
        .set(as(reader));
      const desk = res.body.data.items;
      expect(desk.length).toBeGreaterThan(0);
      for (const row of desk) {
        const report = all.find((x) => String(x._id) === row._id);
        expect(canReadContent(actor, report)).toBe(true);
        expect(String(report.author)).not.toBe(String(reader._id));
        expect(row).not.toHaveProperty("content");
        expect(row).not.toHaveProperty("tasksDone");
      }

      // The Mongo face says the same thing as the predicate.
      const scoped = await Report.find({
        $and: [buildReportScope(actor), contentScope(actor)],
      }).lean();
      expect(idsOf(scoped)).toEqual(idsOf(allowed));
    },
  );

  it("a member's scope is their own reports, and contentScope agrees", async () => {
    const actor = actorOf(people.memberX);
    const listed = await Report.find(buildReportScope(actor)).lean();
    expect(listed).toHaveLength(4);
    const scoped = await Report.find(contentScope(actor)).lean();
    expect(idsOf(scoped)).toEqual(idsOf(listed));
    expect(listed.every((r) => canReadContent(actor, r))).toBe(true);
  });
});

describe("10 · no private layer leaks", () => {
  /** Every read endpoint a reader can call about `author`'s weeks. */
  async function readAll(reader, author) {
    const reports = await Report.find({ author: author._id }).lean();
    const bodies = [];
    const read = async (path) => {
      const res = await api.get(path).set(as(reader));
      bodies.push({ path, status: res.status, body: JSON.stringify(res.body) });
    };
    for (const report of reports) {
      await read(`/api/reports/${report._id}`); // R4
      await read(`/api/reports/${report._id}/revisions`); // R8
      await read(`/api/reports/${report._id}/revisions/1`); // R9
      await read(`/api/users/${author._id}/reports/${report.weekKey}`); // U8
      await read(`/api/updates?weekKey=${report.weekKey}&weekday=mon`); // R12
    }
    await read(`/api/users/${author._id}/reports?limit=100`); // U7
    await read(`/api/review-desk?approval=all&person=${author._id}`); // V3
    await read("/api/review-desk/count"); // V4
    await read("/api/me/new"); // N1
    return bodies;
  }

  it("a teammate never receives any content or week comment", async () => {
    const bodies = await readAll(people.memberY, people.memberX);
    for (const { path, status, body } of bodies) {
      expect(body, path).not.toContain("PRIVATE-");
      if (path.includes("/revisions")) expect(status, path).toBe(403);
    }
    // The shared layer did arrive.
    expect(bodies.some((b) => b.body.includes("Shared line"))).toBe(true);
  });

  it.each(["managerA", "admin"])(
    "%s never receives a Draft's content or a live correction",
    async (who) => {
      const bodies = await readAll(people[who], people.memberX);
      for (const { path, body } of bodies) {
        expect(body, path).not.toContain("PRIVATE-DRAFT");
        expect(body, path).not.toContain("PRIVATE-LIVE");
      }
      // Filed content and week comments do reach them.
      const all = bodies.map((b) => b.body).join("");
      expect(all).toContain("PRIVATE-FILED-notes");
      expect(all).toContain("PRIVATE-WEEKCOMMENT");
    },
  );

  it("a manager's own week is theirs to read; a teammate on it sees nothing private", async () => {
    const own = await readAll(people.managerA, people.managerA);
    expect(own.map((b) => b.body).join("")).toContain("PRIVATE-DRAFT-notes");
    const teammate = await readAll(people.memberX, people.managerA);
    for (const { path, body } of teammate)
      expect(body, path).not.toContain("PRIVATE-");
  });
});
