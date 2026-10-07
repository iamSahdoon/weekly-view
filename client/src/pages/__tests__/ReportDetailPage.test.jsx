import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../../context/AuthContext.jsx";
import { PageChromeProvider } from "../../context/PageChromeContext.jsx";
import { createDemoStore } from "../../demo/demoStore.js";
import { revisionListOf, weekViewOf } from "../../demo/demoWeekView.js";
import { PERSPECTIVES } from "../../demo/fixtures.js";
import { addWeeks, currentWeekKey } from "../../lib/dates.js";
import { qk } from "../../lib/queryKeys.js";
import ReportDetailPage from "../ReportDetailPage.jsx";

// The table in frontend_architecture.md §9.4, one test per row: what the page renders
// is decided by the response, not by the role alone. The WeekView comes from the demo's
// derivation of api_specification.md §1.10 (the same layers the server serves); the
// walkthrough against the real API is recorded in PROGRESS.md.

const THIS = currentWeekKey();
const LAST = addWeeks(THIS, -1);
const store = createDemoStore();
const userOf = (key) => store.users.find((u) => u._id === PERSPECTIVES[key]);

function render(options) {
  const { client, markup } = setup(options);
  return markup(client);
}

function setup({ viewer, owner, weekKey, report: wanted }) {
  const me = userOf(viewer);
  const person = userOf(owner);
  const report =
    wanted === null
      ? undefined
      : store.reports.find(
          (r) => r.author === person._id && r.weekKey === weekKey,
        );
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  const view = weekViewOf(store, me, person, weekKey, report);
  client.setQueryData(qk.week(person._id, weekKey), view);
  if (report && view.report.contentSource !== "withheld") {
    client.setQueryData(
      qk.revisions(report._id),
      revisionListOf(store, report),
    );
  }
  const path =
    me._id === person._id
      ? `/reports/${weekKey}`
      : `/people/${person._id}/reports/${weekKey}`;
  const markup = () =>
    renderToStaticMarkup(
      <AuthContext.Provider
        value={{
          status: "authenticated",
          user: me,
          isDemo: false,
          signInPath: "/signin",
        }}
      >
        <QueryClientProvider client={client}>
          <PageChromeProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route path="/reports/:week" element={<ReportDetailPage />} />
                <Route
                  path="/people/:userId/reports/:week"
                  element={<ReportDetailPage />}
                />
              </Routes>
            </MemoryRouter>
          </PageChromeProvider>
        </QueryClientProvider>
      </AuthContext.Provider>,
    );
  return { client, key: qk.week(person._id, weekKey), markup };
}

const SECTIONS = [
  "Planned for next week",
  "Hours by task type",
  "Notes &amp; links",
];

describe("A week in full — frontend_architecture.md §9.4", () => {
  it("report null: 'No report for week N.' and a Back, for anyone", () => {
    const week = addWeeks(THIS, -9);
    const html = render({
      viewer: "member",
      owner: "member",
      weekKey: week,
      report: null,
    });
    expect(html).toContain(`No report for week ${Number(week.slice(6))}.`);
    expect(html).toContain("Back");
    expect(html).not.toContain("Daily updates");
  });

  it("a teammate: the days and the managers-only note — no document, no comments", () => {
    const html = render({ viewer: "member", owner: "manager", weekKey: LAST });
    expect(html).toContain("Daily updates");
    expect(html).toContain("Scheduler prototype"); // the lines are served
    expect(html).toContain("Weekly reports are shared with managers only.");
    for (const heading of SECTIONS) expect(html).not.toContain(heading);
    expect(html).not.toContain("Overall comments");
    expect(html).not.toContain("Versions");
    // A day closed to the team says so, and carries no Comment button.
    expect(html).toContain(
      "Comments on this update are limited to Nadia and managers.",
    );
  });

  it("a manager on a Draft: the days, and 'not submitted yet' in place of the document", () => {
    const html = render({ viewer: "manager", owner: "member", weekKey: THIS });
    expect(html).toContain("Daily updates");
    expect(html).toContain("Weekly report not submitted yet.");
    expect(html).toContain("once Imali submits it");
    for (const heading of SECTIONS) expect(html).not.toContain(heading);
    expect(html).not.toContain("is correcting this report");
  });

  it("a manager on Needs correction: the sent-back version, under the correcting banner", () => {
    const html = render({ viewer: "manager", owner: "member", weekKey: LAST });
    expect(html).toContain("Imali is correcting this report.");
    expect(html).toContain("You&#x27;re seeing the version sent back on");
    // Revision 1's text, not the author's live correction.
    expect(html).toContain("Test site works end to end");
    expect(html).not.toContain("Thursday testing is in the notes");
    expect(html).not.toContain("card, wallet and refund");
    for (const heading of SECTIONS) expect(html).toContain(heading);
    expect(html).toContain("Overall comments");
    expect(html).toContain("Needs correction");
  });

  it("the author: the live document, her correction, the thread and the versions", () => {
    const html = render({ viewer: "member", owner: "member", weekKey: LAST });
    expect(html).toContain("Thursday testing is in the notes");
    expect(html).toContain("card, wallet and refund");
    expect(html).not.toContain("is correcting this report");
    for (const heading of SECTIONS) expect(html).toContain(heading);
    expect(html).toContain("Overall comments");
    expect(html).toContain("sent back"); // the thread's version and kind
    expect(html).toContain("rev 1");
    // The author may resolve a blocker; the toggle carries its accessible name.
    expect(html).toContain("Mark this blocker as resolved.");
    // A thread she can reply to.
    expect(html).toContain("Reply");
  });

  it("a manager can start an overall comment; the author cannot", () => {
    const manager = render({
      viewer: "manager",
      owner: "member",
      weekKey: LAST,
    });
    expect(manager).toMatch(/>Comment</);
    const author = render({ viewer: "member", owner: "member", weekKey: LAST });
    // The author has `Comment` buttons on her own days, but not in the rail.
    const rail = author.slice(author.indexOf("Overall comments"));
    expect(rail).not.toMatch(/>Comment</);
  });

  it("shows a 'new' marker on a thread the reader hasn't opened, and none on an opened week", () => {
    const html = render({ viewer: "member", owner: "member", weekKey: LAST });
    expect(html).toContain('aria-label="New"');
    const older = render({
      viewer: "member",
      owner: "member",
      weekKey: addWeeks(THIS, -2),
    });
    expect(older).not.toContain('aria-label="New"');
    expect(older).toContain("rev 2");
    expect(older).toContain("approved");
  });

  it("a teammate sees a resolved blocker but not the toggle", () => {
    const html = render({ viewer: "member", owner: "manager", weekKey: LAST });
    expect(html).toContain("Design review slipped to next week");
    expect(html).not.toContain("Mark this blocker as resolved.");
  });

  it("each day is its own card; a day with no update is a short, labelled one", () => {
    const { client, key, markup } = setup({
      viewer: "member",
      owner: "manager",
      weekKey: LAST,
    });
    const quiet = {
      tue: "leave",
      wed: "holiday",
      thu: "missing",
      fri: "future",
    };
    client.setQueryData(key, (view) => ({
      ...view,
      dayStates: { ...view.dayStates, ...quiet },
      report: {
        ...view.report,
        days: view.report.days.filter((d) => d.weekday === "mon"),
      },
    }));
    const html = markup();
    // Five cards, one list item per weekday, each titled with the full weekday.
    for (const day of [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]) {
      expect(html).toContain(day);
    }
    expect(html.match(/<ol class="[^"]*gap-20/g)).toHaveLength(1);
    // Leave is the chip, a holiday its word, Missing keeps its colour, the rest are plain.
    expect(html).toContain("On leave");
    expect(html).toContain("No update needed.");
    expect(html).toContain("Holiday");
    expect(html).toContain("Missing");
    expect(html).toContain("Not yet");
    // Only the posted day has a header with the comment count.
    expect(html.match(/data-testid="day-comment-count"/g)).toHaveLength(1);
  });

  it("a failed background refetch keeps the loaded week on screen", async () => {
    const options = { viewer: "member", owner: "member", weekKey: LAST };
    const { client, key, markup } = setup(options);
    // What a toggle's invalidation does with the API stopped: the week is in the
    // cache, and the refetch that follows fails.
    await client
      .fetchQuery({
        queryKey: key,
        queryFn: () => Promise.reject(new Error("NETWORK_ERROR")),
        staleTime: 0,
      })
      .catch(() => {});
    expect(client.getQueryState(key).status).toBe("error");
    const html = markup();
    expect(html).not.toContain("This week didn’t load.");
    expect(html).toBe(render(options));
  });

  it("a week that never loaded shows the error with Try again", async () => {
    const { client, key, markup } = setup({
      viewer: "member",
      owner: "member",
      weekKey: LAST,
    });
    client.removeQueries({ queryKey: key });
    // A static render can't run the retry that mounting would start.
    client.setQueryDefaults(key, { retryOnMount: false });
    await client
      .fetchQuery({
        queryKey: key,
        queryFn: () => Promise.reject(new Error("NETWORK_ERROR")),
      })
      .catch(() => {});
    const html = markup();
    expect(html).toContain("This week didn’t load.");
    expect(html).toContain("Try again");
  });
});
