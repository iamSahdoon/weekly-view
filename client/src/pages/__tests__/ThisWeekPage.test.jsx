import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DayPanel } from "../../components/report/DayPanel.jsx";
import { AuthContext } from "../../context/AuthContext.jsx";
import { DayDraftsProvider } from "../../context/DayDraftsContext.jsx";
import { PageChromeProvider } from "../../context/PageChromeContext.jsx";
import { UnsavedChangesProvider } from "../../context/UnsavedChangesContext.jsx";
import { createDemoStore } from "../../demo/demoStore.js";
import { meOf, weekViewOf } from "../../demo/demoWeekView.js";
import { PERSPECTIVES } from "../../demo/fixtures.js";
import { addWeeks } from "../../lib/dates.js";
import { qk } from "../../lib/queryKeys.js";
import ThisWeekPage from "../ThisWeekPage.jsx";

// This week (design §3.1, frontend_architecture.md §9.1) and its day panel (§4.11) as
// static renders over the demo's data, on a frozen Wednesday. The panel's choice —
// composer, posted update, or the reason there is nothing to write — comes from
// `dayStates` and the report's status. Clicks (post, edit, switch) are walked through
// in the browser and recorded in PROGRESS.md.

const THIS = "2026-W41";
let store;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0)); // Wednesday
  store = createDemoStore();
});
afterAll(() => vi.useRealTimers());

const userOf = (role) => store.users.find((u) => u._id === PERSPECTIVES[role]);
const reportOf = (role, weekKey) =>
  store.reports.find(
    (r) => r.author === PERSPECTIVES[role] && r.weekKey === weekKey,
  );

function wrap(client, me, element, path = "/") {
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{ status: "authenticated", user: meOf(store, me), isDemo: false }}
    >
      <QueryClientProvider client={client}>
        <UnsavedChangesProvider>
          <PageChromeProvider>
            <MemoryRouter initialEntries={[path]}>
              <DayDraftsProvider>{element}</DayDraftsProvider>
            </MemoryRouter>
          </PageChromeProvider>
        </UnsavedChangesProvider>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

const newClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });

function panel(role, weekKey, weekday) {
  const me = userOf(role);
  const view = weekViewOf(store, me, me, weekKey, reportOf(role, weekKey));
  const client = newClient();
  client.setQueryData(qk.tasks({ includeDone: false }), { items: [] });
  client.setQueryData(qk.projects({ mine: true }), { items: [] });
  return wrap(client, me, <DayPanel week={view} weekday={weekday} isOwn />);
}

describe("the day panel — design §4.11", () => {
  it("today, not posted: the composer", () => {
    const html = panel("member", THIS, "wed");
    expect(html).toContain("Wed 7 Oct");
    expect(html).toContain("What did you do?");
    expect(html).toContain("Post update");
    expect(html).toContain(">Save<");
    expect(html).toContain("Open to team comments");
    expect(html).toContain("Add a line");
    expect(html).not.toContain("is missing");
  });

  it("a posted day: its lines, Posted and the time, and Edit while the week is open", () => {
    const html = panel("member", THIS, "mon");
    expect(html).toContain("Posted 17:00");
    expect(html).toContain(">Edit<");
    expect(html).not.toContain("Post update");
  });

  it("a missing day opens the composer with the line that says why it matters", () => {
    const report = reportOf("member", THIS);
    const tuesday = report.days.find((d) => d.weekday === "tue");
    report.days = report.days.filter((d) => d !== tuesday);
    try {
      const html = panel("member", THIS, "tue");
      expect(html).toContain(
        "Tuesday’s update is missing — your report can’t be submitted without it.",
      );
      expect(html).toContain("Post update");
    } finally {
      report.days.push(tuesday);
    }
  });

  it("a frozen week reads posted days without Edit", () => {
    const html = panel("manager", addWeeks(THIS, -1), "tue");
    expect(html).toContain("Posted");
    expect(html).not.toContain(">Edit<");
    expect(html).not.toContain("Post update");
  });

  it("a holiday or a day ahead has no composer", () => {
    store.holidays.push({
      _id: "0d0000000000000000000001",
      date: "2026-10-09",
      name: "Test holiday",
      createdBy: PERSPECTIVES.admin,
    });
    try {
      expect(panel("member", THIS, "fri")).toContain(
        "Holiday — no update needed.",
      );
      expect(panel("member", THIS, "thu")).toContain(
        "This day hasn’t happened yet.",
      );
      expect(panel("member", THIS, "thu")).not.toContain("Post update");
    } finally {
      store.holidays.pop();
    }
  });
});

function page(role, { reports } = {}) {
  const me = userOf(role);
  const client = newClient();
  const view = weekViewOf(store, me, me, THIS, reportOf(role, THIS));
  client.setQueryData(qk.week(me._id, THIS), view);
  client.setQueryData(
    qk.reports({ limit: 20, sort: "weekKey", dir: "desc" }),
    reports ?? {
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    },
  );
  client.setQueryData(qk.holidays(2026), { items: [] });
  client.setQueryData(qk.projects({ mine: true }), { items: [] });
  client.setQueryData(qk.onLeave(), { items: [] });
  client.setQueryData(qk.summary(THIS, "2026-10"), {
    weeksFiled: 2,
    hoursThisMonth: 12.5,
    openBlockers: 1,
  });
  client.setQueryData(qk.tasks({ includeDone: false }), { items: [] });
  return wrap(client, me, <ThisWeekPage />);
}

describe("This week — design §3.1", () => {
  it("the strip, today's composer, the week's panel and the personal strip", () => {
    const html = page("member", {
      reports: {
        items: [],
        meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
      },
    });
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Today");
    expect(html).toContain("What did you do?"); // Wednesday, today, is chosen
    expect(html).toContain("Week 41");
    expect(html).toContain("Days posted");
    expect(html).toContain("2 of 5");
    expect(html).toContain("Open this week’s report");
    expect(html).toContain("Hours logged this month");
    expect(html).toContain("Recent weeks");
    expect(html).not.toContain("Your first week starts here.");
  });

  it("nothing ever: the strip and one panel, nothing else", () => {
    const html = page("admin"); // Sanduni has no reports
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Your first week starts here.");
    expect(html).not.toContain("What did you do?");
    expect(html).not.toContain("Days posted");
    expect(html).not.toContain("Recent weeks");
  });
});
