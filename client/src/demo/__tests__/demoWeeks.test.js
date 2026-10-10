import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../services/apiClient.js";
import * as reportService from "../../services/reportService.js";
import * as reviewService from "../../services/reviewService.js";
import * as userService from "../../services/userService.js";
import { addWeeks, currentWeekKey } from "../../lib/dates.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// The demo applies the server's rules for reading a week and for comments, so the
// pages' error paths run in it (frontend_architecture.md §11.2). These hold the rules
// the pages depend on; demoCoverage.test.js holds that every service is answered.

let store;
const as = (role) => {
  store.session.userId = PERSPECTIVES[role];
};
const reportOf = (author, weekKey) =>
  store.reports.find(
    (r) => r.author === PERSPECTIVES[author] && r.weekKey === weekKey,
  );
const code = (promise) =>
  promise.then(
    () => null,
    (error) => error.code,
  );

const THIS = currentWeekKey();
const LAST = addWeeks(THIS, -1);

beforeEach(() => {
  store = createDemoStore(undefined, { team: false });
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
  as("member");
});

describe("the layers of a week (I15)", () => {
  it("serves a teammate the days and withholds the rest", async () => {
    const view = await userService.getUserWeek(PERSPECTIVES.manager, LAST);
    expect(view.report.days).toHaveLength(5);
    expect(view.report.hoursByType).toBeTruthy();
    expect(view.report.content).toBeNull();
    expect(view.report.weekComments).toBeNull();
    expect(view.report.latestComment).toBeNull();
    expect(view.report.contentSource).toBe("withheld");
    expect(
      view.report.tasks.every((t) => t.status === null && t.note === null),
    ).toBe(true);
  });

  it("serves a manager a Draft's days only", async () => {
    as("manager");
    const view = await userService.getUserWeek(PERSPECTIVES.member, THIS);
    expect(view.report.status).toBe("draft");
    expect(view.report.days.length).toBeGreaterThan(0);
    expect(view.report.content).toBeNull();
    expect(view.report.contentSource).toBe("withheld");
  });

  it("serves a manager the sent-back version, and the author the live correction", async () => {
    const live = (await reportService.getMyWeek(LAST)).report;
    expect(live.contentSource).toBe("live");
    expect(live.content.notes).toMatch(/card, wallet and refund/);

    as("manager");
    const seen = (await userService.getUserWeek(PERSPECTIVES.member, LAST))
      .report;
    expect(seen.contentSource).toBe("revision");
    expect(seen.contentRevisionNumber).toBe(1);
    expect(seen.content.notes).toBe("");
    expect(seen.weekComments).toHaveLength(1);
  });

  it("answers a week with no report as null, not an error", async () => {
    const view = await reportService.getMyWeek(addWeeks(THIS, -9));
    expect(view.report).toBeNull();
    expect(view.state).toBe("not_started");
    expect(Object.values(view.dayStates).every((s) => s === "missing")).toBe(
      true,
    );
  });

  it("refuses a teammate the versions, and an unknown person is a 404", async () => {
    const id = reportOf("manager", LAST)._id;
    expect(await code(reportService.listRevisions(id))).toBe(
      "REPORT_FORBIDDEN",
    );
    expect(await code(userService.getUserWeek("0".repeat(24), THIS))).toBe(
      "USER_NOT_FOUND",
    );
  });
});

describe("blockers and team comments", () => {
  it("lets the author and a manager resolve, and refuses a teammate", async () => {
    const report = reportOf("member", LAST);
    const blocker = report.days[0].blockers[0]._id;
    const first = await reportService.clearResolution(report._id, blocker);
    expect(first.resolvedAt).toBeNull();
    const resolved = await reportService.setResolution(report._id, blocker);
    expect(resolved.resolvedBy.name).toBeTruthy();
    // Resolving twice keeps the first time.
    const again = await reportService.setResolution(report._id, blocker);
    expect(again.resolvedAt).toBe(resolved.resolvedAt);

    const nadia = reportOf("manager", LAST);
    expect(
      await code(
        reportService.setResolution(nadia._id, nadia.days[3].blockers[0]._id),
      ),
    ).toBe("REPORT_FORBIDDEN");
    expect(
      await code(reportService.setResolution(report._id, "f".repeat(24))),
    ).toBe("BLOCKER_NOT_FOUND");
  });

  it("opens a day to team comments, and that lets a teammate comment on it", async () => {
    const nadia = reportOf("manager", LAST);
    // Closed: a teammate can read the day but not write.
    const view = await userService.getUserWeek(PERSPECTIVES.manager, LAST);
    expect(view.report.days[0].canComment).toBe(false);
    expect(await code(reviewService.commentOnDay(nadia._id, "mon", "Hi"))).toBe(
      "COMMENT_NOT_ALLOWED",
    );

    as("manager");
    const day = await reportService.setTeamComments(nadia._id, "mon", true);
    expect(day.openToTeam).toBe(true);

    as("member");
    const posted = await reviewService.commentOnDay(nadia._id, "mon", "Hi");
    expect(posted.comments.at(-1).author.name).toBeTruthy();
    expect(posted.canComment).toBe(true);
  });
});

describe("week comments (C2, C3)", () => {
  it("lets a manager start one on a submitted report, never on a Draft or their own", async () => {
    as("manager");
    const imaliLast = reportOf("member", LAST);
    const result = await reviewService.commentOnWeek(
      imaliLast._id,
      "One more thing.",
    );
    const thread = result.weekComments.at(-1);
    expect(thread.kind).toBe("comment");
    expect(thread.revisionNumber).toBe(1);

    expect(
      await code(
        reviewService.commentOnWeek(reportOf("member", THIS)._id, "Early"),
      ),
    ).toBe("REPORT_STATE_CHANGED");
    expect(
      await code(
        reviewService.commentOnWeek(reportOf("manager", LAST)._id, "Mine"),
      ),
    ).toBe("COMMENT_NOT_ALLOWED");
  });

  it("lets the author reply on a week thread and refuses a teammate", async () => {
    const imaliLast = reportOf("member", LAST);
    const reply = await reviewService.reply(
      imaliLast._id,
      imaliLast.weekComments[0]._id,
      "On it.",
    );
    expect(reply.replies.at(-1).text).toBe("On it.");
    expect(reply.kind).toBe("send_back");

    // A teammate holds no reply on someone else's week thread.
    store.session.userId = PERSPECTIVES.admin;
    store.users.find((u) => u._id === PERSPECTIVES.admin).role = "member";
    expect(
      await code(
        reviewService.reply(
          imaliLast._id,
          imaliLast.weekComments[0]._id,
          "Hello",
        ),
      ),
    ).toBe("COMMENT_NOT_ALLOWED");
  });
});

describe("the ten-minute window (C4, C5)", () => {
  afterEach(() => vi.useRealTimers());

  it("edits and deletes inside the window, and closes it at ten minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date());
    const report = reportOf("member", THIS);
    const day = await reviewService.commentOnDay(report._id, "mon", "First");
    const thread = day.comments.at(-1);
    expect(new Date(thread.editableUntil) - new Date(thread.createdAt)).toBe(
      600_000,
    );

    vi.advanceTimersByTime(9 * 60_000 + 59_000);
    const edited = await reviewService.editComment(
      report._id,
      thread._id,
      "Edited",
    );
    expect(edited.editedAt).not.toBeNull();
    expect(edited.text).toBe("Edited");

    vi.advanceTimersByTime(2_000); // 10 min 1 s after posting
    expect(
      await code(reviewService.editComment(report._id, thread._id, "Late")),
    ).toBe("EDIT_WINDOW_CLOSED");
    expect(
      await code(reviewService.deleteComment(report._id, thread._id)),
    ).toBe("EDIT_WINDOW_CLOSED");
  });

  it("refuses to delete a comment with replies, and a send-back", async () => {
    as("manager");
    const imaliLast = reportOf("member", LAST);
    const result = await reviewService.commentOnWeek(
      imaliLast._id,
      "A question.",
    );
    const thread = result.weekComments.at(-1);
    await reviewService.reply(imaliLast._id, thread._id, "Fine.");
    expect(
      await code(reviewService.deleteComment(imaliLast._id, thread._id)),
    ).toBe("COMMENT_HAS_REPLIES");

    // The send-back itself: older than the window here, so build one inside it.
    imaliLast.weekComments[0].createdAt = new Date().toISOString();
    imaliLast.weekComments[0].replies = [];
    expect(
      await code(
        reviewService.deleteComment(
          imaliLast._id,
          imaliLast.weekComments[0]._id,
        ),
      ),
    ).toBe("COMMENT_HAS_REPLIES");
  });

  it("deletes a reply and answers with the containing day", async () => {
    const report = reportOf("member", THIS);
    const day = await reviewService.commentOnDay(report._id, "mon", "Q");
    const thread = day.comments.at(-1);
    const replied = await reviewService.reply(report._id, thread._id, "A");
    const left = await reviewService.deleteReply(
      report._id,
      thread._id,
      replied.replies[0]._id,
    );
    expect(left.weekday).toBe("mon");
    expect(
      left.comments.find((t) => t._id === thread._id).replies,
    ).toHaveLength(0);
  });
});

describe("the new markers", () => {
  it("marks what others wrote until the week is opened, then not", async () => {
    const before = (await reportService.getMyWeek(LAST)).report;
    expect(before.weekComments[0].isNew).toBe(true);
    expect(before.days[1].comments[0].isNew).toBe(true);

    await reportService.markSeen(before._id);
    const after = (await reportService.getMyWeek(LAST)).report;
    expect(after.weekComments[0].isNew).toBe(false);
    expect(after.days[1].comments[0].isNew).toBe(false);
  });

  it("never marks a writer's own comment", async () => {
    const report = reportOf("member", THIS);
    await reviewService.commentOnDay(report._id, "mon", "Mine");
    const view = (await reportService.getMyWeek(THIS)).report;
    expect(view.days[0].comments.at(-1).isNew).toBe(false);
  });
});
