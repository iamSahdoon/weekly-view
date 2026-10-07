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
import { ActivityFeed } from "../../components/dashboard/ActivityFeed.jsx";
import { ChartTooltip } from "../../components/dashboard/ChartTooltip.jsx";
import { HoursByTypeChart } from "../../components/dashboard/HoursByTypeChart.jsx";
import { MetricStrip } from "../../components/dashboard/MetricStrip.jsx";
import { ProjectsTable } from "../../components/dashboard/ProjectsTable.jsx";
import { TeamTable } from "../../components/dashboard/TeamTable.jsx";
import {
  UpdatesCell,
  UpdatesLegend,
} from "../../components/dashboard/UpdatesCell.jsx";
import { updatesSentence } from "../../lib/dashboardData.js";
import { AuthContext } from "../../context/AuthContext.jsx";
import { PageChromeProvider } from "../../context/PageChromeContext.jsx";
import { createDemoAdapter } from "../../demo/demoAdapter.js";
import { createDemoStore } from "../../demo/demoStore.js";
import { meOf } from "../../demo/demoWeekView.js";
import { PERSPECTIVES } from "../../demo/fixtures.js";
import { DASHBOARD_SPEC, dashboardParams } from "../../lib/dashboardParams.js";
import { qk } from "../../lib/queryKeys.js";
import { parseParams } from "../../lib/urlParams.js";
import * as dashboardService from "../../services/dashboardService.js";
import { apiClient } from "../../services/apiClient.js";
import * as projectService from "../../services/projectService.js";
import * as userService from "../../services/userService.js";
import TeamDashboardPage from "../TeamDashboardPage.jsx";

// The team dashboard (design §3.7, §7) as static renders over the demo's answers on a
// frozen Wednesday. Each block is its own query, so a failed one is rendered here beside
// blocks that loaded. What a click does (the status filter, the trend's window and person,
// the Days | Hours control, the week picker) and how the charts look is walked through in a
// real browser against the real API and recorded in PROGRESS.md.

const THIS = "2026-W41";
const LAST = "2026-W40";
let store;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0)); // Wednesday
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  store = createDemoStore();
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
});

const as = (role) => {
  store.session.userId = PERSPECTIVES[role];
  return store.users.find((u) => u._id === PERSPECTIVES[role]);
};
const newClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
const parse = (query = "") =>
  parseParams(DASHBOARD_SPEC, new URLSearchParams(query));

// The cache the page reads, filled from the demo as a manager would get it.
async function primed(query = "") {
  as("manager");
  const client = newClient();
  const p = dashboardParams(parse(query), THIS);
  const put = async (key, call) => client.setQueryData(key, await call());
  await Promise.all([
    put(qk.dashboard.summary(THIS, p.summary), () =>
      dashboardService.getSummary(p.summary),
    ),
    put(qk.dashboard.team(THIS, p.team), () =>
      dashboardService.getTeam(p.team),
    ),
    put(qk.dashboard.projects(THIS, p.projects), () =>
      dashboardService.getProjects(p.projects),
    ),
    put(qk.dashboard.trend(THIS, p.trend), () =>
      dashboardService.getTrend(p.trend),
    ),
    put(qk.dashboard.hours(THIS, p.hours), () =>
      dashboardService.getHours(p.hours),
    ),
    put(qk.dashboard.workload(THIS, p.workload), () =>
      dashboardService.getWorkload(p.workload),
    ),
    put(qk.dashboard.activity(), () => dashboardService.getActivity()),
    put(qk.users({ limit: 100 }), () => userService.listUsers({ limit: 100 })),
    put(qk.projects({ usedInWeek: THIS }), () =>
      projectService.listProjects({ usedInWeek: THIS }),
    ),
  ]);
  return client;
}

function renderPage(role, client, path = "/team") {
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
              <Route path="/team" element={<TeamDashboardPage />} />
            </Routes>
          </MemoryRouter>
        </PageChromeProvider>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

const inRouter = (element) =>
  renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
const loaded = (data) => ({
  isPending: false,
  isError: false,
  isFetching: false,
  isPlaceholderData: false,
  data,
  refetch() {},
});
const failed = {
  isPending: false,
  isError: true,
  isFetching: false,
  isPlaceholderData: false,
  data: undefined,
  refetch() {},
};
const loading = { isPending: true, isError: false, data: undefined };
const noop = () => {};

describe("the dashboard page", () => {
  it("renders the seven blocks, in the order of design §3.7", async () => {
    const html = renderPage("manager", await primed());
    const at = (text) => {
      const i = html.indexOf(text);
      expect(i, text).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      "Filed this week",
      'aria-label="Team"',
      'aria-label="Projects"',
      'aria-label="Tasks completed"',
      'aria-label="Hours by task type"',
      'aria-label="Workload by project"',
      'aria-label="Recent activity"',
    ].map(at);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("lists everyone on the team in name order, the Draft and the two not started", async () => {
    const html = renderPage("manager", await primed());
    const imali = html.indexOf("Imali J.");
    const nadia = html.indexOf("Nadia F.");
    const sanduni = html.indexOf("Sanduni B.");
    expect(imali).toBeGreaterThan(-1);
    expect(imali).toBeLessThan(nadia);
    expect(nadia).toBeLessThan(sanduni);
    expect(html).toContain("Draft");
    expect(html).toContain("Not started");
  });

  it("has the four metrics and the team table's own status filter, and no `All activity`", async () => {
    const html = renderPage("manager", await primed());
    for (const label of [
      "Filed this week",
      "Compliance",
      "Needs correction",
      "Open blockers",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(">Status<");
    expect(html).not.toContain("All activity");
  });

  it("gives each chart a hidden text summary, and the legend to the stacked chart only", async () => {
    const html = renderPage("manager", await primed());
    for (const caption of [
      "Tasks completed per week",
      "Hours by task type, week 41",
      "Hours by project, week 41",
    ]) {
      expect(html).toContain(`<caption>${caption}</caption>`);
    }
    const headerOf = (label) => {
      const from = html.slice(html.indexOf(`aria-label="${label}"`));
      return from.slice(0, from.indexOf("</header>"));
    };
    expect(headerOf("Workload by project")).toContain('aria-label="Legend"');
    expect(headerOf("Hours by task type")).not.toContain("Legend");
    expect(headerOf("Tasks completed")).not.toContain("Legend"); // no one to compare yet
  });

  it("explains what each chart counts, one line under its title, and the labels are totals", async () => {
    const html = renderPage("manager", await primed());
    expect(html).toContain("Tasks marked Done in submitted reports.");
    expect(html).toContain("Each number is that type’s total.");
    expect(html).toContain("Each number is that project’s total.");
  });

  it("shows the designed skeletons while every block loads, with the filter bar live", () => {
    const html = renderPage("manager", newClient());
    expect(html.match(/wv-skeleton/g).length).toBeGreaterThan(20);
    expect(html).toContain("Person");
    expect(html).toContain("All projects");
  });

  it("says there is no team, hides the strip, and offers `Invite people` to an admin only", async () => {
    // Everyone joins in the future, so nobody is on the team this week.
    for (const user of store.users) {
      user.joinedAt = new Date(Date.now() + 90 * 86_400_000).toISOString();
    }
    const asManager = renderPage("manager", await primed());
    expect(asManager).toContain("No one is on the team yet.");
    expect(asManager).not.toContain("Filed this week");
    expect(asManager).not.toContain("Invite people</a>");
    const asAdmin = renderPage("admin", await primed());
    expect(asAdmin).toContain("No one is on the team yet.");
    expect(asAdmin).toContain("Invite people</a>");
  });

  it("does not say there is no team when a filter, rather than the week, emptied the table", async () => {
    const html = renderPage(
      "manager",
      await primed("status=approved"),
      "/team?status=approved",
    );
    expect(html).not.toContain("No one is on the team yet.");
    expect(html).toContain("No one matches this status.");
  });
});

describe("each block fails on its own", () => {
  it("a failed metric strip leaves the team table beside it", async () => {
    as("manager");
    const team = await dashboardService.getTeam({ weekKey: THIS });
    const html = inRouter(
      <>
        <MetricStrip query={failed} />
        <TeamTable
          query={loaded(team)}
          weekKey={THIS}
          meId={PERSPECTIVES.manager}
          status={[]}
          onStatus={noop}
          sort={{ id: "name", dir: "asc" }}
          onSort={noop}
          onPage={noop}
          onLimit={noop}
        />
      </>,
    );
    expect(html).toContain("The week’s numbers didn’t load.");
    expect(html).toContain("Try again");
    expect(html).toContain("Imali J.");
  });

  it("a failed chart keeps its title and says so inside its panel, at its real height", () => {
    const html = inRouter(<HoursByTypeChart query={failed} weekKey={THIS} />);
    expect(html).toContain("Hours by task type");
    expect(html).toContain("This chart didn’t load.");
    expect(html).toContain("height:240px");
  });

  it("a failed feed and a failed projects table each show their own error", () => {
    const feed = inRouter(<ActivityFeed query={failed} meId="x" />);
    const projects = inRouter(
      <ProjectsTable query={failed} unit="days" onUnitChange={noop} />,
    );
    expect(feed).toContain("Recent activity didn’t load.");
    expect(projects).toContain("The projects table didn’t load.");
    expect(projects).toContain("Days"); // the header's control stays
  });

  it("a loading chart is a skeleton as tall as the chart", () => {
    const html = inRouter(<HoursByTypeChart query={loading} weekKey={THIS} />);
    expect(html).toContain("wv-skeleton");
    expect(html).toContain("height:240px");
  });
});

describe("the team table", () => {
  const rowsOf = (weekKey, params = {}) => {
    as("manager");
    return dashboardService.getTeam({ weekKey, ...params });
  };
  const render = (data, status = []) =>
    inRouter(
      <TeamTable
        query={loaded(data)}
        weekKey={LAST}
        meId={PERSPECTIVES.manager}
        status={status}
        onStatus={noop}
        sort={{ id: "name", dir: "asc" }}
        onSort={noop}
        onPage={noop}
        onLimit={noop}
      />,
    );

  it("has the columns of design §3.7", async () => {
    const html = render(await rowsOf(LAST));
    for (const header of [
      "Person",
      "Updates",
      "Projects",
      "Status",
      "Asked",
      "Versions",
      "Hours",
      "Last activity",
    ]) {
      expect(html).toContain(`>${header}`);
    }
  });

  it("links your own row to your week, someone else's Submitted report to review, the rest to their week", async () => {
    // Last week: Nadia (the viewer) is Submitted; make Imali's Submitted too.
    store.reports.find(
      (r) => r.author === PERSPECTIVES.member && r.weekKey === LAST,
    ).status = "submitted";
    const data = await rowsOf(LAST);
    const html = render(data);
    const imali = data.items.find((r) => r.user.name === "Imali J.");
    const nadia = data.items.find((r) => r.user.name === "Nadia F.");
    expect(html).toContain(`href="/review/${imali.report._id}"`);
    expect(html).toContain(`href="/reports/${LAST}"`);
    expect(html).not.toContain(`/review/${nadia.report._id}`);
    expect(html).toContain(
      `href="/people/${PERSPECTIVES.admin}/reports/${LAST}"`,
    );
  });

  it("shows `Approval asked` only on a Submitted report that asked", async () => {
    store.reports.find(
      (r) => r.author === PERSPECTIVES.manager && r.weekKey === LAST,
    ).approvalRequested = true;
    const html = render(await rowsOf(LAST));
    expect(html.match(/Approval asked/g)).toHaveLength(1);
  });

  it("names the chosen status on the filter, and keeps the header over an empty filtered table", async () => {
    const data = await rowsOf(LAST, { status: "approved" });
    expect(data.items).toEqual([]);
    const html = render(data, ["approved"]);
    expect(html).toContain("Status: Approved");
    expect(html).toContain("No one matches this status.");
    expect(html).toContain("Clear filters");
    expect(html).toContain(">Person");
  });
});

describe("the five-day strip", () => {
  const states = {
    mon: "posted",
    tue: "posted",
    wed: "missing",
    thu: "today",
    fri: "future",
  };
  const cell = (html, state) =>
    html.match(new RegExp(`data-state="${state}" style="([^"]*)"`))[1];

  it("is five cells with the state on each, and the same in words", () => {
    const html = renderToStaticMarkup(<UpdatesCell dayStates={states} />);
    expect(html.match(/data-state=/g)).toHaveLength(5);
    for (const state of ["posted", "missing", "today", "future"]) {
      expect(html).toContain(`data-state="${state}"`);
    }
    expect(html).toContain("Posted Mon, Tue; missing Wed; not yet today Thu");
    expect(html).toContain("size-[14px]");
  });

  const allSix = {
    mon: "posted",
    tue: "missing",
    wed: "leave",
    thu: "holiday",
    fri: "future",
  };

  it("draws each state in the product's own palette: cobalt, the correction red, cool neutrals", () => {
    const html = renderToStaticMarkup(
      <UpdatesCell dayStates={{ ...allSix, fri: "today" }} />,
    );
    // Posted: solid cobalt, the accent — not green.
    expect(cell(html, "posted")).toContain("background:var(--acc)");
    // Missing: the Needs-correction red — a tint, a 2px edge (not a hairline) and an ×.
    const missing = cell(html, "missing");
    expect(missing).toContain("var(--st-corr-bg)");
    expect(missing).toContain("border:2px solid var(--st-corr-fg)");
    expect(missing.match(/linear-gradient/g)).toHaveLength(2);
    // Today: a cobalt outline.
    expect(cell(html, "today")).toContain("border:2px solid var(--acc)");
    // Leave and holiday: neutral tones, on a --tint2 fill.
    for (const state of ["leave", "holiday"]) {
      expect(cell(html, state)).toContain("var(--tint2)");
      expect(cell(html, state)).toContain("var(--mut)");
    }
    // Nothing is green or purple any more.
    expect(html).not.toMatch(/--st-appr|--c\d/);
  });

  it("keeps leave and holiday apart: a diagonal hatch against a dot grid", () => {
    const html = renderToStaticMarkup(<UpdatesCell dayStates={allSix} />);
    const leave = cell(html, "leave");
    const holiday = cell(html, "holiday");
    expect(leave).toContain("repeating-linear-gradient(45deg");
    expect(leave).not.toContain("radial-gradient");
    expect(holiday).toContain("radial-gradient");
    expect(holiday).not.toContain("linear-gradient");
    expect(leave).not.toBe(holiday);
    expect(updatesSentence(allSix)).toBe(
      "Posted Mon; missing Tue; on leave Wed; holiday Thu",
    );
  });

  it("tells every state apart without colour: its pattern or its edge differs", () => {
    const six = {
      mon: "posted",
      tue: "missing",
      wed: "leave",
      thu: "holiday",
      fri: "today",
    };
    const html =
      renderToStaticMarkup(<UpdatesCell dayStates={six} />) +
      renderToStaticMarkup(<UpdatesCell dayStates={{ mon: "future" }} />);
    // Strip every colour: what is left is the pattern kind, the fill and the edge width.
    const shape = (state) => {
      const css = cell(html, state);
      const image = /repeating-linear/.test(css)
        ? "hatch"
        : /radial/.test(css)
          ? "dots"
          : /linear-gradient/.test(css)
            ? "cross"
            : "none";
      const solid = /background:var\(--acc\)/.test(css) ? "solid" : "open";
      const edge = css.match(/border:(\d)px/)[1];
      return `${image}/${solid}/${edge}px`;
    };
    const shapes = [
      "posted",
      "missing",
      "leave",
      "holiday",
      "today",
      "future",
    ].map(shape);
    expect(shapes).toEqual([
      "none/solid/1px",
      "cross/open/2px",
      "hatch/open/1px",
      "dots/open/1px",
      "none/open/2px",
      "none/open/1px",
    ]);
    // Six states, and the strings differ except where the pattern does: posted (solid)
    // and the two hollow outlines (today 2px, later 1px) are separated by fill and edge.
    expect(new Set(shapes).size).toBe(6);
  });

  it("has a legend with the same six cells and their words", () => {
    const html = renderToStaticMarkup(<UpdatesLegend />);
    for (const words of [
      "Posted",
      "Missing",
      "Not posted yet today",
      "On leave",
      "Holiday",
      "Later this week",
    ]) {
      expect(html).toContain(words);
    }
    expect(html.match(/data-state=/g)).toHaveLength(6);
    for (const state of [
      "posted",
      "missing",
      "today",
      "leave",
      "holiday",
      "future",
    ]) {
      expect(html).toContain(`data-state="${state}"`);
    }
  });

  it("is under the team table", async () => {
    const html = renderPage("manager", await primed());
    const legend = html.indexOf("What the update squares mean");
    expect(legend).toBeGreaterThan(html.indexOf('aria-label="Team"'));
    expect(legend).toBeLessThan(html.indexOf('aria-label="Pagination"'));
  });

  it("uses tokens only", () => {
    const html = renderToStaticMarkup(<UpdatesCell dayStates={states} />);
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe("the metric strip", () => {
  // Built per test: the clock is frozen when a test runs, not when the file is read.
  const makeSummary = () => ({
    weekKey: THIS,
    filed: 9,
    expected: 12,
    notFiled: 3,
    onLeave: 1,
    compliance: 0.75,
    complianceTrailing: { weeks: 8, rate: 0.82 },
    needsCorrection: {
      count: 2,
      oldestSentBackAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    },
    openBlockers: { count: 3, peopleCount: 3 },
  });
  const text = (html) => html.replace(/<[^>]+>/g, "");

  it("is the design's four cells with their sub-lines", () => {
    const words = text(
      renderToStaticMarkup(<MetricStrip query={loaded(makeSummary())} />),
    );
    expect(words).toContain("Filed this week9/ 12");
    expect(words).toContain("3 not yet filed · 1 on leave");
    expect(words).toContain("Compliance75%");
    expect(words).toContain("this week · 82% over 8 weeks");
    expect(words).toContain("Needs correction2");
    expect(words).toContain("oldest sent back 3 days ago");
    expect(words).toContain("raised by 3 people");
  });

  it("colours the four numbers by what they measure, and Needs correction stays the red one", () => {
    const html = renderToStaticMarkup(
      <MetricStrip query={loaded(makeSummary())} />,
    );
    const colourOf = (value) =>
      html.match(
        new RegExp(
          `class="[^"]*(text-(?:acc-txt|st-[a-z]+-fg))[^"]*"[^>]*>${value}<`,
        ),
      )?.[1];
    expect(colourOf("9")).toBe("text-acc-txt"); // Filed
    expect(colourOf("75%")).toBe("text-st-appr-fg"); // Compliance
    expect(colourOf("2")).toBe("text-st-corr-fg"); // Needs correction
    expect(colourOf("3")).toBe("text-st-draft-fg"); // Open blockers
    expect(html.match(/text-st-corr-fg/g)).toHaveLength(1); // only one is the alarm
  });

  it("is one panel: a single section with hairline gaps, not four cards", () => {
    const html = renderToStaticMarkup(
      <MetricStrip query={loaded(makeSummary())} />,
    );
    expect(html.match(/<section/g)).toHaveLength(1);
    expect(html).toContain("gap-px");
    expect(html).not.toContain("rounded");
  });

  it("omits a sub-line with nothing honest to say, rather than padding it", () => {
    const quiet = text(
      renderToStaticMarkup(
        <MetricStrip
          query={loaded({
            ...makeSummary(),
            needsCorrection: { count: 0, oldestSentBackAt: null },
            openBlockers: { count: 0, peopleCount: 0 },
            onLeave: 0,
            compliance: null,
            complianceTrailing: { weeks: 8, rate: null },
          })}
        />,
      ),
    );
    expect(quiet).not.toContain("oldest sent back");
    expect(quiet).not.toContain("raised by");
    expect(quiet).not.toContain("on leave");
    expect(quiet).toContain("Compliance—this week");
    expect(quiet).not.toContain("over 8 weeks");
  });
});

describe("the projects table", () => {
  const projectsData = async () => {
    as("manager");
    return dashboardService.getProjects({ weekKey: THIS });
  };

  it("shows days or hours by the unit, and overdue in words", async () => {
    const data = await projectsData();
    data.items[0].progress = {
      ...data.items[0].progress,
      daysUsed: 23,
      daysLeft: 0,
      overdueDays: 3,
    };
    const days = inRouter(
      <ProjectsTable query={loaded(data)} unit="days" onUnitChange={noop} />,
    );
    expect(days).toContain("overdue by 3 days");
    const hours = inRouter(
      <ProjectsTable query={loaded(data)} unit="hours" onUnitChange={noop} />,
    );
    expect(hours).toMatch(/\d+(\.\d+)? h/);
    expect(hours).not.toContain("overdue by");
  });

  it("says no project has a plan, and points to Projects", () => {
    const html = inRouter(
      <ProjectsTable
        query={loaded({ items: [] })}
        unit="days"
        onUnitChange={noop}
      />,
    );
    expect(html).toContain("No project has a plan yet.");
    expect(html).toContain('href="/projects"');
    expect(html).toContain("Open projects");
  });

  it("has `Extend plan` only when the page passes `onExtend` (PlanModal is C8's)", async () => {
    const data = await projectsData();
    const without = inRouter(
      <ProjectsTable query={loaded(data)} unit="days" onUnitChange={noop} />,
    );
    const withMenu = inRouter(
      <ProjectsTable
        query={loaded(data)}
        unit="days"
        onUnitChange={noop}
        onExtend={noop}
      />,
    );
    expect(without).not.toContain("Extend plan");
    expect(withMenu).toContain("Extend plan");
  });

  it("makes each row a closed disclosure: who worked on it is one click away", async () => {
    const html = inRouter(
      <ProjectsTable
        query={loaded(await projectsData())}
        unit="days"
        onUnitChange={noop}
      />,
    );
    expect(html).toContain('aria-expanded="false"');
  });
});

describe("recent activity", () => {
  it("lists events with their verbs, at most eight, and holds its height", async () => {
    as("manager");
    const data = await dashboardService.getActivity();
    const html = inRouter(
      <ActivityFeed query={loaded(data)} meId={PERSPECTIVES.manager} />,
    );
    expect(html).toContain("sent back");
    expect(html).toMatch(/submitted|approved/);
    expect(html).not.toContain("All activity");
    expect(html.match(/<li/g).length).toBeLessThanOrEqual(8);
    expect(html).toContain("min-h-[352px]");
  });
});

describe("the chart tooltip", () => {
  const describeRows = (payload) => ({
    title: "W40 · 28 Sep – 2 Oct",
    rows: payload.map((p) => ({
      color: p.color,
      label: p.name,
      value: p.value,
    })),
  });
  const payload = [{ color: "var(--c1)", name: "Development", value: "6 h" }];

  it("is ours: the dark-band surface, a mono header, a swatch from a token and the value", () => {
    const html = renderToStaticMarkup(
      <ChartTooltip active payload={payload} describe={describeRows} />,
    );
    expect(html).toContain("bg-d-panel");
    expect(html).toContain("font-mono");
    expect(html).toContain("var(--shadow-pop)");
    expect(html).toContain("background:var(--c1)");
    expect(html).toContain("Development");
    expect(html).toContain("6 h");
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("renders nothing when inactive or with nothing to say", () => {
    const render = (props) =>
      renderToStaticMarkup(<ChartTooltip describe={describeRows} {...props} />);
    expect(render({ active: false, payload })).toBe("");
    expect(render({ active: true, payload: [] })).toBe("");
    expect(
      render({
        active: true,
        payload,
        describe: () => ({ title: "x", rows: [] }),
      }),
    ).toBe("");
  });
});

describe("the dashboard's source", () => {
  const sources = import.meta.glob(
    [
      "../../components/dashboard/*.jsx",
      "../../lib/chartTheme.js",
      "../TeamDashboardPage.jsx",
    ],
    { query: "?raw", import: "default", eager: true },
  );
  const files = Object.entries(sources);
  const codeOf = (source) =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("is read (a glob that matches nothing would pass every check below)", () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
  });

  it("has no hex value and no rgb() or hsl() colour", () => {
    for (const [path, source] of files) {
      expect(codeOf(source), path).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(codeOf(source), path).not.toMatch(/\b(rgb|hsl)a?\(/);
    }
  });

  it("never imports the library's legend, and gives every tooltip our own content", () => {
    for (const [path, source] of files) {
      expect(source, path).not.toMatch(
        /import\s*\{[^}]*\bLegend\b[^}]*\}\s*from "recharts"/,
      );
      for (const tag of source.match(/<Tooltip\b[\s\S]*?\/>/g) ?? []) {
        expect(tag, path).toContain("content={<ChartTooltip");
      }
    }
  });

  it("starts every series' animation from useHasMounted, so the mount doesn't animate", () => {
    let checked = 0;
    for (const [path, source] of files) {
      if (!/<(Line|Bar)\b/.test(source) || !/from "recharts"/.test(source))
        continue;
      expect(source, path).toContain("useHasMounted");
      for (const tag of source.match(/<(Line|Bar)\b[^>]*>/g) ?? []) {
        // The one exception draws nothing: a hair-wide bar that only carries a label.
        if (
          /fill="none"/.test(
            source.slice(source.indexOf(tag), source.indexOf(tag) + 200),
          )
        )
          continue;
        expect(
          tag + source.slice(source.indexOf(tag), source.indexOf(tag) + 600),
          path,
        ).toContain("isAnimationActive={hasMounted}");
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(4);
  });

  it("never draws a pie or a donut", () => {
    for (const [path, source] of files) {
      expect(codeOf(source), path).not.toMatch(/\bPie(Chart)?\b/);
    }
  });
});
