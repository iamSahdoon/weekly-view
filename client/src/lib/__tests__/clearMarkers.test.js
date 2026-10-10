import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  clearedFeed,
  clearedRows,
  clearedWeekView,
  clearListMarkers,
  clearWeekMarkers,
} from "../clearMarkers.js";
import { qk } from "../queryKeys.js";

// Opening a week clears its markers (design §6.24). The server stops reporting them at
// once; these functions clear the copies still in the cache so a week reopened inside the
// 30 s staleTime shows none (frontend_architecture.md §9.4, FA11).

const thread = (id, isNew) => ({ _id: id, isNew, replies: [] });
const view = (reportId, { dayNew = true, weekNew = true } = {}) => ({
  weekKey: "2026-W40",
  report: {
    _id: reportId,
    days: [
      { weekday: "mon", comments: [thread("t1", dayNew), thread("t2", false)] },
      { weekday: "tue", comments: [] },
    ],
    weekComments: [thread("w1", weekNew)],
  },
});

describe("clearedWeekView", () => {
  it("clears every thread of the report, day and week", () => {
    const next = clearedWeekView(view("r1"), "r1");
    expect(next.report.days[0].comments.map((t) => t.isNew)).toEqual([
      false,
      false,
    ]);
    expect(next.report.weekComments[0].isNew).toBe(false);
  });

  it("leaves another report, a null report and an unmarked report as they were", () => {
    const other = view("r2");
    expect(clearedWeekView(other, "r1")).toBe(other);
    const none = { weekKey: "2026-W40", report: null };
    expect(clearedWeekView(none, "r1")).toBe(none);
    const clean = view("r1", { dayNew: false, weekNew: false });
    expect(clearedWeekView(clean, "r1")).toBe(clean);
  });

  it("does not touch what is not a week view (a revisions list)", () => {
    const revisions = { items: [{ revisionNumber: 1 }] };
    expect(clearedWeekView(revisions, "r1")).toBe(revisions);
  });
});

describe("clearedRows", () => {
  const rows = {
    items: [
      { _id: "r1", isNew: true },
      { _id: "r2", isNew: true },
    ],
    meta: { total: 2 },
  };

  it("clears the one row and only that row", () => {
    const next = clearedRows(rows, "r1");
    expect(next.items.map((r) => r.isNew)).toEqual([false, true]);
    expect(next.meta).toBe(rows.meta);
  });

  it("returns the same object when nothing changes, and ignores a non-list", () => {
    expect(clearedRows(rows, "r9")).toBe(rows);
    const summary = { weekKey: "2026-W40", hours: 10 };
    expect(clearedRows(summary, "r1")).toBe(summary);
  });
});

describe("clearedFeed", () => {
  it("clears the threads of that report's day in the team feed", () => {
    const feed = {
      items: [
        { reportId: "r1", day: { comments: [thread("t", true)] } },
        { reportId: "r2", day: { comments: [thread("u", true)] } },
        { reportId: null, day: null },
      ],
    };
    const next = clearedFeed(feed, "r1");
    expect(next.items[0].day.comments[0].isNew).toBe(false);
    expect(next.items[1]).toBe(feed.items[1]);
    expect(clearedFeed(feed, "r9")).toBe(feed);
  });
});

describe("clearing a QueryClient", () => {
  const client = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(qk.week("u1", "2026-W40"), view("r1"));
    queryClient.setQueryData(qk.report("r1"), view("r1"));
    queryClient.setQueryData(qk.report("r2"), view("r2"));
    queryClient.setQueryData(qk.reports({ page: 1 }), {
      items: [{ _id: "r1", isNew: true }],
    });
    queryClient.setQueryData(qk.reviewDesk({ page: 1 }), {
      items: [{ _id: "r1", isNew: true }],
    });
    queryClient.setQueryData(qk.reviewDeskCount(), { count: 2 });
    queryClient.setQueryData(qk.reportsOf("u1", {}), {
      items: [{ _id: "r1", isNew: true }],
    });
    queryClient.setQueryData(qk.teamUpdates("2026-W40", "mon", {}), {
      items: [{ reportId: "r1", day: { comments: [thread("t", true)] } }],
    });
    return queryClient;
  };
  const isNew = (queryClient, key) =>
    JSON.stringify(queryClient.getQueryData(key)).includes('"isNew":true');

  it("lists and the feed are cleared when R13 lands, the week itself is not", () => {
    const queryClient = client();
    clearListMarkers(queryClient, "r1");
    expect(isNew(queryClient, qk.reports({ page: 1 }))).toBe(false);
    expect(isNew(queryClient, qk.reviewDesk({ page: 1 }))).toBe(false);
    expect(isNew(queryClient, qk.reportsOf("u1", {}))).toBe(false);
    expect(isNew(queryClient, qk.teamUpdates("2026-W40", "mon", {}))).toBe(
      false,
    );
    // The open page keeps what it opened with (FA11), and V4's count is not a list.
    expect(isNew(queryClient, qk.week("u1", "2026-W40"))).toBe(true);
    expect(isNew(queryClient, qk.report("r1"))).toBe(true);
    expect(queryClient.getQueryData(qk.reviewDeskCount())).toEqual({
      count: 2,
    });
  });

  it("the cached week and report are cleared once the page is left, and no other report", () => {
    const queryClient = client();
    clearWeekMarkers(queryClient, "r1");
    expect(isNew(queryClient, qk.week("u1", "2026-W40"))).toBe(false);
    expect(isNew(queryClient, qk.report("r1"))).toBe(false);
    expect(isNew(queryClient, qk.report("r2"))).toBe(true);
  });
});
