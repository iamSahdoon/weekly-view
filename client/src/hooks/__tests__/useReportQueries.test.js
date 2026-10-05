import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { qk } from "../../lib/queryKeys.js";

const { toast } = vi.hoisted(() => ({
  toast: { error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));

const service = vi.hoisted(() => ({
  setResolution: vi.fn(),
  clearResolution: vi.fn(),
  setTeamComments: vi.fn(),
}));
vi.mock("../../services/reportService.js", () => service);

const { resolveBlockerOptions, teamCommentsOptions } =
  await import("../useReportQueries.js");

// The two optimistic toggles (frontend_architecture.md §5.7): they flip at once, and
// when the server refuses they restore the cache and raise an error toast with Retry
// — which sends the same write again.

const WEEK = {
  user: { _id: "u1" },
  weekKey: "2026-W40",
  report: { _id: "r1" },
};
const KEY = qk.week("u1", "2026-W40");
const ME = { _id: "u1", name: "Imali J." };

const view = () => ({
  ...WEEK,
  report: {
    ...WEEK.report,
    days: [
      {
        weekday: "mon",
        openToTeam: false,
        blockers: [
          { _id: "b1", text: "Waiting", resolvedAt: null, resolvedBy: null },
        ],
      },
    ],
  },
});
const apiError = (code) =>
  Object.assign(new Error(code), { name: "ApiError", code });

let client;
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  client.setQueryData(KEY, view());
});

const blocker = () => client.getQueryData(KEY).report.days[0].blockers[0];
const day = () => client.getQueryData(KEY).report.days[0];

describe("resolving a blocker", () => {
  it("flips at once, before the server answers", async () => {
    let finish;
    service.setResolution.mockReturnValue(
      new Promise((resolve) => (finish = resolve)),
    );
    const observer = new MutationObserver(
      client,
      resolveBlockerOptions({
        queryClient: client,
        week: WEEK,
        me: ME,
        retry: vi.fn(),
      }),
    );
    const pending = observer.mutate({ blockerId: "b1", resolved: true });
    await vi.waitFor(() => expect(blocker().resolvedAt).not.toBeNull());
    expect(blocker().resolvedBy).toEqual(ME);
    finish({});
    await pending;
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("restores the cache and raises an error toast with Retry when it fails", async () => {
    service.setResolution.mockRejectedValue(apiError("NETWORK_ERROR"));
    const retry = vi.fn();
    const observer = new MutationObserver(
      client,
      resolveBlockerOptions({ queryClient: client, week: WEEK, me: ME, retry }),
    );
    await observer.mutate({ blockerId: "b1", resolved: true }).catch(() => {});

    expect(blocker().resolvedAt).toBeNull();
    expect(blocker().resolvedBy).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(1);
    const [title, options] = toast.error.mock.calls[0];
    expect(title).toBe("That blocker wasn’t marked as resolved.");
    expect(options.description).toBe("Couldn't reach the server.");
    expect(options.duration).toBe(Infinity); // an error stays until dismissed
    expect(options.action.label).toBe("Retry");

    // Retry sends the same write again.
    options.action.onClick();
    expect(retry).toHaveBeenCalledWith({ blockerId: "b1", resolved: true });
  });

  it("restores the resolved state when reopening fails", async () => {
    client.setQueryData(KEY, {
      ...view(),
      report: {
        ...view().report,
        days: [
          {
            weekday: "mon",
            openToTeam: false,
            blockers: [
              {
                _id: "b1",
                text: "Waiting",
                resolvedAt: "2026-10-01T09:00:00.000Z",
                resolvedBy: ME,
              },
            ],
          },
        ],
      },
    });
    service.clearResolution.mockRejectedValue(apiError("REPORT_FORBIDDEN"));
    const observer = new MutationObserver(
      client,
      resolveBlockerOptions({
        queryClient: client,
        week: WEEK,
        me: ME,
        retry: vi.fn(),
      }),
    );
    await observer.mutate({ blockerId: "b1", resolved: false }).catch(() => {});
    expect(blocker().resolvedAt).toBe("2026-10-01T09:00:00.000Z");
    expect(toast.error.mock.calls[0][0]).toBe("That blocker wasn’t reopened.");
  });

  it("marks the week stale afterwards, success or failure, so the server's truth wins", async () => {
    service.setResolution.mockRejectedValue(apiError("NETWORK_ERROR"));
    const spy = vi.spyOn(client, "invalidateQueries");
    const observer = new MutationObserver(
      client,
      resolveBlockerOptions({
        queryClient: client,
        week: WEEK,
        me: ME,
        retry: vi.fn(),
      }),
    );
    await observer.mutate({ blockerId: "b1", resolved: true }).catch(() => {});
    const keys = spy.mock.calls.map(([arg]) => arg.queryKey);
    expect(keys).toContainEqual(KEY);
    expect(keys).toContainEqual(qk.report("r1"));
  });
});

describe("opening a day to team comments", () => {
  it("flips at once and, on failure, restores it with an error toast and Retry", async () => {
    service.setTeamComments.mockRejectedValue(apiError("FORBIDDEN"));
    const retry = vi.fn();
    const observer = new MutationObserver(
      client,
      teamCommentsOptions({ queryClient: client, week: WEEK, retry }),
    );
    const pending = observer
      .mutate({ weekday: "mon", open: true })
      .catch(() => {});
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    await pending;

    expect(day().openToTeam).toBe(false);
    const [title, options] = toast.error.mock.calls[0];
    expect(title).toBe("That day’s comment setting didn’t save.");
    expect(options.duration).toBe(Infinity);
    options.action.onClick();
    expect(retry).toHaveBeenCalledWith({ weekday: "mon", open: true });
  });

  it("keeps the new value when the server accepts it, with no toast", async () => {
    service.setTeamComments.mockResolvedValue({});
    const observer = new MutationObserver(
      client,
      teamCommentsOptions({ queryClient: client, week: WEEK, retry: vi.fn() }),
    );
    await observer.mutate({ weekday: "mon", open: true });
    expect(day().openToTeam).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

// The Team updates page shows the same days, so its feed flips with the week (§9.2).
describe("a toggle made on the team updates feed", () => {
  const FEED = qk.teamUpdates("2026-W40", "mon", {});
  const entry = (reportId) => ({
    reportId,
    day: {
      weekday: "mon",
      openToTeam: false,
      blockers: [{ _id: `b-${reportId}`, resolvedAt: null, resolvedBy: null }],
    },
  });
  const feed = () => client.getQueryData(FEED).items;

  beforeEach(() => {
    client.setQueryData(FEED, {
      items: [entry("r1"), entry("r2"), { reportId: null, day: null }],
    });
  });

  it("flips only that report's day, and restores it when the server refuses", async () => {
    let fail;
    service.setTeamComments.mockReturnValue(
      new Promise((_, reject) => (fail = reject)),
    );
    const observer = new MutationObserver(
      client,
      teamCommentsOptions({ queryClient: client, week: WEEK, retry: vi.fn() }),
    );
    const pending = observer
      .mutate({ weekday: "mon", open: true })
      .catch(() => {});
    await vi.waitFor(() => expect(feed()[0].day.openToTeam).toBe(true));
    expect(feed()[1].day.openToTeam).toBe(false);
    expect(feed()[2]).toEqual({ reportId: null, day: null });

    fail(apiError("NETWORK_ERROR"));
    await pending;
    expect(feed()[0].day.openToTeam).toBe(false);
  });

  it("resolves a blocker in the feed at once, and restores it on failure", async () => {
    client.setQueryData(KEY, {
      ...view(),
      report: {
        ...view().report,
        days: [
          {
            weekday: "mon",
            openToTeam: false,
            blockers: [{ _id: "b-r1", resolvedAt: null, resolvedBy: null }],
          },
        ],
      },
    });
    let fail;
    service.setResolution.mockReturnValue(
      new Promise((_, reject) => (fail = reject)),
    );
    const observer = new MutationObserver(
      client,
      resolveBlockerOptions({
        queryClient: client,
        week: WEEK,
        me: ME,
        retry: vi.fn(),
      }),
    );
    const pending = observer
      .mutate({ blockerId: "b-r1", resolved: true })
      .catch(() => {});
    await vi.waitFor(() =>
      expect(feed()[0].day.blockers[0].resolvedAt).not.toBeNull(),
    );
    expect(feed()[1].day.blockers[0].resolvedAt).toBeNull();

    fail(apiError("NETWORK_ERROR"));
    await pending;
    expect(feed()[0].day.blockers[0].resolvedAt).toBeNull();
  });
});
