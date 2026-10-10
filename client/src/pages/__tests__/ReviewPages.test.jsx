import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AuthContext } from "../../context/AuthContext.jsx";
import { PageChromeProvider } from "../../context/PageChromeContext.jsx";
import { createDemoAdapter } from "../../demo/demoAdapter.js";
import { createDemoStore } from "../../demo/demoStore.js";
import { meOf } from "../../demo/demoWeekView.js";
import { PERSPECTIVES } from "../../demo/fixtures.js";
import { addWeeks } from "../../lib/dates.js";
import { qk } from "../../lib/queryKeys.js";
import { nextInQueueParams } from "../../lib/reviewDeskParams.js";
import { resolveUpdatesDay } from "../../lib/updatesDay.js";
import * as reportService from "../../services/reportService.js";
import * as reviewService from "../../services/reviewService.js";
import { apiClient } from "../../services/apiClient.js";
import ReportHistoryPage from "../ReportHistoryPage.jsx";
import ReviewDeskPage from "../ReviewDeskPage.jsx";
import ReviewPage from "../ReviewPage.jsx";
import TeamUpdatesPage from "../TeamUpdatesPage.jsx";

// History, team updates, the review desk and the review page (design §3.3, §3.16, §3.5,
// §3.6) as static renders over the demo's data, on a frozen Wednesday. The data comes
// through the demo adapter — the same answers the pages get in the demo — and is primed
// into the cache. What a click does (approve, send back, the stale-version banner, Next
// in review desk) is walked through against the real API and recorded in PROGRESS.md.

const THIS = "2026-W41";
const LAST = addWeeks(THIS, -1);
let store;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0)); // Wednesday
});
afterAll(() => vi.useRealTimers());

// A store of its own per test: the review actions and the history cases change it.
beforeEach(() => {
  store = createDemoStore(undefined, { team: false });
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
});

const as = (role) => {
  store.session.userId = PERSPECTIVES[role];
  return store.users.find((u) => u._id === PERSPECTIVES[role]);
};
const reportOf = (role, weekKey) =>
  store.reports.find(
    (r) => r.author === PERSPECTIVES[role] && r.weekKey === weekKey,
  );
const newClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });

function render(role, path, routePath, element, client = newClient()) {
  const me = as(role);
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        status: "authenticated",
        user: meOf(store, me),
        isDemo: false,
        signInPath: "/signin",
      }}
    >
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={routePath} element={element} />
            </Routes>
          </MemoryRouter>
        </PageChromeProvider>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

// ---------------------------------------------------------------- the review page

async function reviewPage(viewer, report) {
  const me = as(viewer);
  const client = newClient();
  client.setQueryData(
    qk.report(report._id),
    await reportService.getReport(report._id),
  );
  client.setQueryData(
    qk.revisions(report._id),
    await reportService.listRevisions(report._id),
  );
  return render(
    viewer,
    `/review/${report._id}`,
    "/review/:reportId",
    <ReviewPage />,
    client,
    me,
  );
}

describe("the review page — design §3.6", () => {
  it("someone else's submitted report: the document, the rail and the action panel", async () => {
    const html = await reviewPage("admin", reportOf("manager", LAST));
    expect(html).toContain("Read-only — you can comment, but you can’t edit.");
    expect(html).toContain("Daily updates");
    expect(html).toContain("Planned for next week");
    expect(html).toContain("Nadia F.");
    expect(html).toContain("Manager"); // her role chip
    expect(html).toContain("Approval not asked");
    expect(html).toContain("1 version");
    // One textarea, three actions.
    expect(html).toContain("Overall comment");
    expect(html).toContain(
      "Add a comment on the week, or say what needs to change if you’re sending it back.",
    );
    for (const label of [">Approve<", ">Send back<", ">Comment only<"]) {
      expect(html).toContain(label);
    }
  });

  it("your own report: the guard's strip, the document, and no action panel in the tree", async () => {
    const html = await reviewPage("manager", reportOf("manager", LAST));
    expect(html).toContain("You can’t review your own report.");
    expect(html).toContain("Planned for next week");
    expect(html).not.toContain('id="review-comment"');
    for (const label of ["Approve", "Send back", "Comment only"]) {
      expect(html).not.toContain(label);
    }
  });

  it("a report already approved: the outcome in place of the panel", async () => {
    const report = reportOf("manager", LAST);
    as("admin");
    await reviewService.approve(report._id, { revisionNumber: 1 });
    // A third manager opens it afterwards (Imali, promoted for this case).
    as("member").role = "manager";
    const html = await reviewPage("member", report);
    expect(html).toContain("Approved by Sanduni B. at");
    expect(html).not.toContain(">Approve<");
    expect(html).not.toContain("Next in review desk");
  });

  it("a Draft: its versions are withheld, so none are asked for, and there is nothing to review", async () => {
    const report = reportOf("member", THIS);
    as("manager");
    const client = newClient();
    client.setQueryData(
      qk.report(report._id),
      await reportService.getReport(report._id),
    );
    const html = render(
      "manager",
      `/review/${report._id}`,
      "/review/:reportId",
      <ReviewPage />,
      client,
    );
    expect(html).toContain("This report hasn’t been submitted");
    expect(html).not.toContain("Versions");
    expect(html).not.toContain(">Approve<");
  });

  it("a report sent back: who sent it back, and the version they read", async () => {
    const html = await reviewPage("manager", reportOf("member", LAST));
    expect(html).toContain("Sent back by Nadia F.");
    expect(html).toContain("Imali is correcting this report.");
    expect(html).not.toContain('id="review-comment"');
  });
});

// ---------------------------------------------------------------- the review desk

describe("the review desk — design §3.5", () => {
  const params = {
    approval: "all",
    sort: "submittedAt",
    dir: "asc",
    page: 1,
    limit: 20,
  };

  async function desk(role, search, apiParams = params) {
    as(role);
    const client = newClient();
    client.setQueryData(
      qk.reviewDesk(apiParams),
      await reviewService.listReviewDesk(apiParams),
    );
    return render(
      role,
      `/review${search}`,
      "/review",
      <ReviewDeskPage />,
      client,
    );
  }

  it("nothing asked: 'Nothing waiting.' and no header", async () => {
    const html = await desk("admin", "", { ...params, approval: "requested" });
    expect(html).toContain("Nothing waiting.");
    expect(html).toContain("Reports that ask for approval land here.");
    expect(html).not.toContain("<table");
    expect(html).toContain("Asked for approval");
    expect(html).toContain("All submitted");
  });

  it("All submitted: the row, with the columns of §3.5", async () => {
    const html = await desk("admin", "?approval=all");
    for (const header of [
      "Person",
      "Projects",
      "Week",
      "Submitted",
      "Versions",
      "Asked",
      "Status",
    ]) {
      expect(html).toContain(`>${header}<`);
    }
    expect(html).toContain("Nadia F.");
    expect(html).toContain("Manager");
    expect(html).toContain("R&amp;D");
    expect(html).toContain("Submitted");
    expect(html).toContain(`href="/review/${reportOf("manager", LAST)._id}"`);
    expect(html).toContain("Clear (1)"); // `all` counts as a filter
  });

  it("filters that exclude everything: the header stays", async () => {
    const empty = { ...params, person: PERSPECTIVES.member };
    const html = await desk(
      "admin",
      `?approval=all&person=${PERSPECTIVES.member}`,
      empty,
    );
    expect(html).toContain("No reports match these filters.");
    expect(html).toContain("<table");
    expect(html).toContain("Clear filters");
  });

  it("your own report is not on your desk", async () => {
    const html = await desk("manager", "?approval=all");
    expect(html).toContain("No reports match these filters.");
    expect(html).not.toContain("Nadia F.");
  });

  it("'Next in review desk' asks for page 1, oldest first, under the desk's filters", () => {
    expect(
      nextInQueueParams("?approval=all&sort=weekKey&dir=desc&page=2"),
    ).toEqual(params);
  });
});

// ---------------------------------------------------------------- my reports

describe("my reports — design §3.3", () => {
  const params = {
    status: undefined,
    sort: "weekKey",
    dir: "desc",
    page: 1,
    limit: 20,
  };

  async function history(role, apiParams, search = "") {
    as(role);
    const client = newClient();
    client.setQueryData(
      qk.reports(apiParams),
      await reportService.listMyReports(apiParams),
    );
    return render(
      role,
      `/reports${search}`,
      "/reports",
      <ReportHistoryPage />,
      client,
    );
  }

  it("a row per week: Draft and Needs-correction open the form and say Editable", async () => {
    const html = await history("member", {
      sort: "weekKey",
      dir: "desc",
      page: 1,
      limit: 20,
    });
    for (const header of [
      "Week",
      "Dates",
      "Projects",
      "Tasks",
      "Hours",
      "Versions",
      "Last activity",
      "Status",
    ]) {
      expect(html).toContain(`>${header}<`);
    }
    expect(html).toContain(`href="/reports/${THIS}/edit"`); // the Draft
    expect(html).toContain(`href="/reports/${LAST}/edit"`); // sent back
    expect(html).toContain(`href="/reports/${addWeeks(THIS, -2)}"`); // approved
    expect(html.match(/Editable/g)).toHaveLength(2);
    expect(html).toContain("Needs correction");
    expect(html).toContain("Approved");
    void params;
  });

  it("a person with no reports yet: the table is replaced by the first-time state", async () => {
    as("manager");
    store.reports = store.reports.filter(
      (r) => r.author !== PERSPECTIVES.manager,
    );
    const html = await history("manager", {
      sort: "weekKey",
      dir: "desc",
      page: 1,
      limit: 20,
    });
    expect(html).toContain("No reports yet.");
    expect(html).toContain("Each week you post updates for is listed here.");
    expect(html).toContain("Post today’s update");
    expect(html).not.toContain("<table");
  });

  it("filters that exclude everything: the header stays and Clear filters appears", async () => {
    const apiParams = {
      status: "approved",
      project: "none",
      sort: "weekKey",
      dir: "desc",
      page: 1,
      limit: 20,
    };
    const html = await history(
      "member",
      apiParams,
      "?status=approved&project=none",
    );
    expect(html).toContain("No reports match these filters.");
    expect(html).toContain("<table");
    expect(html).toContain("Clear filters");
  });
});

// ---------------------------------------------------------------- team updates

describe("team updates — design §3.16", () => {
  async function updates(role, weekKey = THIS, search = "") {
    as(role);
    const weekday = resolveUpdatesDay(null, weekKey, {});
    const client = newClient();
    client.setQueryData(
      qk.teamUpdates(weekKey, weekday, {}),
      await reportService.listTeamUpdates({ weekKey, weekday }),
    );
    return render(
      role,
      `/updates${search}`,
      "/updates",
      <TeamUpdatesPage />,
      client,
    );
  }

  it("today's day for everyone, the viewer first; people who haven't posted are one-line rows", async () => {
    const html = await updates("member");
    // Wednesday: Imali (a Draft with Monday and Tuesday only) hasn't posted today.
    expect(html).toContain("Imali J.");
    expect(html.indexOf("Imali J.")).toBeLessThan(html.indexOf("Nadia F."));
    expect(html).toContain("Not posted yet");
    expect(html).toContain('href="/reports/2026-W41"'); // her own name goes to her page
    expect(html).toContain(
      `href="/people/${PERSPECTIVES.manager}/reports/${THIS}"`,
    );
  });

  it("the day tabs: today selected, the days ahead disabled", async () => {
    const html = await updates("member");
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/aria-selected="true"[^>]*>Wed 7/);
    expect(html).toMatch(/disabled=""[^>]*>Thu 8/);
    expect(html).toMatch(/disabled=""[^>]*>Fri 9/);
  });

  it("a posted day: lines, the blocker, and the closed-to-teammates line", async () => {
    const html = await updates("member", LAST, `?week=${LAST}`);
    // Friday of last week: everyone posted; Nadia's day is closed to teammates.
    expect(html).toContain("Scheduler prototype");
    expect(html).toContain(
      "Comments on this update are limited to Nadia and managers.",
    );
  });

  it("filters: a project and only blockers", async () => {
    const html = await updates("manager", THIS, "?blockers=1");
    expect(html).toContain("Only blockers");
    expect(html).toContain('aria-label="Project"');
  });
});
