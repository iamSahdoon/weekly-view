import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext.jsx";
import { PageChromeProvider } from "../../context/PageChromeContext.jsx";
import { UnsavedChangesProvider } from "../../context/UnsavedChangesContext.jsx";
import { createDemoStore } from "../../demo/demoStore.js";
import { meOf, weekViewOf } from "../../demo/demoWeekView.js";
import { PERSPECTIVES } from "../../demo/fixtures.js";
import { addWeeks } from "../../lib/dates.js";
import { qk } from "../../lib/queryKeys.js";
import ReportEditPage from "../ReportEditPage.jsx";

// The weekly form (design §3.2, §4; frontend_architecture.md §6.4, §9.3) as static
// renders over the demo's data, on a frozen Wednesday. Typing, autosave, submit and the
// 360px layout are walked through in the browser and recorded in PROGRESS.md.

const THIS = "2026-W41";
const LAST = addWeeks(THIS, -1);
let store;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
  store = createDemoStore(undefined, { team: false });
});
afterAll(() => vi.useRealTimers());

function render(weekKey, edit) {
  const me = store.users.find((u) => u._id === PERSPECTIVES.member);
  const report = store.reports.find(
    (r) => r.author === me._id && r.weekKey === weekKey,
  );
  edit?.(report);
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(
    qk.week(me._id, weekKey),
    weekViewOf(store, me, me, weekKey, report),
  );
  client.setQueryData(qk.holidays(2026), { items: [] });
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{ status: "authenticated", user: meOf(store, me), isDemo: false }}
    >
      <QueryClientProvider client={client}>
        <UnsavedChangesProvider>
          <PageChromeProvider>
            <MemoryRouter initialEntries={[`/reports/${weekKey}/edit`]}>
              <Routes>
                <Route
                  path="/reports/:week/edit"
                  element={<ReportEditPage />}
                />
              </Routes>
            </MemoryRouter>
          </PageChromeProvider>
        </UnsavedChangesProvider>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

describe("the weekly form — design §4", () => {
  it("a Draft: the week summary, six numbered sections, the rail and the bar", () => {
    const html = render(THIS);
    expect(html).toContain("W41 · 5–9 Oct");
    expect(html).toContain("Days posted:");
    for (const title of [
      "Tasks",
      "Planned for next week",
      "Blockers &amp; challenges",
      "Achievements",
      "Hours by task type",
      "Notes &amp; links",
    ]) {
      expect(html).toContain(title);
    }
    expect(html).toContain('aria-label="Report sections"');
    expect(html).toContain("Every working day has an update");
    expect(html).toContain("Every task has a status");
    expect(html).toContain(
      "Tasks come from your daily updates. To add or change one, edit that day.",
    );
    expect(html).toContain("Ask for approval");
    expect(html).toContain(
      "A manager will be asked to approve this week. Without it, your report is complete once submitted.",
    );
    expect(html).toContain(">Save<");
    expect(html).not.toContain("Resubmit");
    expect(html).not.toContain("Needs correction");
  });

  it("no default status: a task without one shows the placeholder", () => {
    const html = render(THIS);
    expect(html).toContain("Set status");
    expect(html).toMatch(/<option value="" disabled="" selected="">Set status/);
  });

  it("Submit is disabled with a named reason while a day is missing", () => {
    const html = render(THIS);
    expect(html).toMatch(/aria-disabled="true"[^>]*>.*Submit/);
    // The reason, as the mobile line above the bar.
    expect(html).toContain("Wednesday has no update.");
    // Missing days link to the day panel.
    expect(html).toContain(`href="/?week=${THIS}&amp;day=wed"`);
  });

  it("hours by type are calculated: seven rows and a total", () => {
    const html = render(THIS);
    for (const label of [
      "Development",
      "Testing",
      "Meetings",
      "Documentation",
      "Review",
      "Research &amp; study",
      "Other",
      "Total",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("the key blocker is a radiogroup and the flagged one reads Key", () => {
    const html = render(LAST);
    expect(html).toContain('role="radiogroup" aria-label="Key blocker"');
    expect(html).toContain('role="radio" aria-checked="true"');
    expect(html).toContain(">Key<");
  });

  it("Needs correction: the correction panel above section 01, Resubmit enabled", () => {
    const html = render(LAST);
    expect(html).toContain('aria-label="Needs correction"');
    expect(html).toContain("Sent back by");
    expect(html).not.toContain("Open and fix");
    expect(html).toContain("Resubmit");
    expect(html).not.toMatch(/aria-disabled="true"[^>]*>.*Resubmit/);
    // Its statuses and notes are the author's live ones.
    expect(html).toContain("Basket and address done; shipping next");
  });
});
