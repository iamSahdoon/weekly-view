import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Panel } from "../../components/ui/Panel.jsx";
import { SampleDataPill } from "../../components/ui/SampleDataPill.jsx";
import { DemoBar } from "../../components/shell/DemoBar.jsx";
import { AuthContext } from "../../context/AuthContext.jsx";
import DemoEntryPage from "../../pages/DemoEntryPage.jsx";
import { apiClient } from "../../services/apiClient.js";
import * as authService from "../../services/authService.js";
import * as holidayService from "../../services/holidayService.js";
import { bootDemo, demo } from "../bootDemo.js";

// The demo's entry and chrome (design §3.14; frontend_architecture.md §9.18, §11): the
// chooser, the bar, the SAMPLE DATA pill, and the two ways back to the start.

const inDemo = (children, user = null) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider
        value={{ isDemo: true, status: "authenticated", user, signOut() {} }}
      >
        <MemoryRouter>{children}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
const outsideDemo = (children) =>
  renderToStaticMarkup(
    <AuthContext.Provider value={{ isDemo: false }}>
      {children}
    </AuthContext.Provider>,
  );
const nadia = { _id: "a02", name: "Nadia F.", role: "manager" };

describe("the chooser", () => {
  const html = inDemo(<DemoEntryPage />);

  it("says what the demo is, up front", () => {
    expect(html).toContain("Try WeeklyView");
    expect(html).toContain(
      "Pick who you’d like to be. Everything works, nothing is saved.",
    );
  });

  it("offers the three perspectives, each with one line and who you would be", () => {
    for (const text of [
      "Team member",
      "Post updates, build and submit a week",
      "Imali J.",
      "Manager",
      "Read the team, comment, approve, track projects",
      "Nadia F.",
      "Admin",
      "Everything a manager does, plus people and holidays",
      "Sanduni B., the owner",
    ]) {
      expect(html).toContain(text);
    }
    expect(html.match(/<button/g)).toHaveLength(3);
  });

  it("sits on the product's page, with no landing class, and a way back", () => {
    expect(html).toContain("bg-paper");
    expect(html).not.toContain("landing");
    expect(html).toContain('href="/"');
  });
});

describe("the demo bar", () => {
  const html = inDemo(<DemoBar />, nadia);

  it("is a 36px region with the marker, who you are, Switch, Start over and the way out", () => {
    expect(html).toContain('aria-label="Demo"');
    expect(html).toContain("height:36px");
    expect(html).toContain("SAMPLE DATA");
    expect(html).toContain("Nadia F.");
    expect(html).toContain("Manager");
    expect(html).toContain("Switch");
    expect(html).toContain("Start over");
    expect(html).toMatch(/<a [^>]*href="\/signin"[^>]*>Sign in<\/a>/);
  });

  it("is the theme-independent dark band, not --ink, and is not printed", () => {
    expect(html).toContain("bg-d-panel");
    expect(html).not.toContain("bg-ink");
    expect(html).toContain("print:hidden");
  });
});

describe("the SAMPLE DATA pill", () => {
  it("shows on a data panel in the demo, in mono caps", () => {
    const html = inDemo(
      <Panel title="Leave" sample>
        x
      </Panel>,
    );
    expect(html).toContain("SAMPLE DATA");
    expect(html).toContain("border-dashed");
    expect(html).toContain("font-mono");
  });

  it("is absent from a panel not marked as data, and outside the demo", () => {
    expect(inDemo(<Panel title="Appearance">x</Panel>)).not.toContain(
      "SAMPLE DATA",
    );
    expect(
      outsideDemo(
        <Panel title="Leave" sample>
          x
        </Panel>,
      ),
    ).not.toContain("SAMPLE DATA");
    expect(outsideDemo(<SampleDataPill />)).toBe("");
    // A component rendered with no provider at all is not the demo.
    expect(renderToStaticMarkup(<SampleDataPill />)).toBe("");
  });
});

describe("choosing a perspective and starting over", () => {
  it("reads the Me of whoever was chosen, through the adapter and no network", async () => {
    bootDemo();
    const asked = [];
    apiClient.interceptors.request.use((config) => {
      asked.push(config.url);
      return config;
    });
    const me = {};
    for (const role of ["member", "manager", "admin"]) {
      demo.setPerspective(role);
      me[role] = await authService.getMe();
    }
    expect(me.member).toMatchObject({ name: "Imali J.", role: "member" });
    expect(me.manager).toMatchObject({ name: "Nadia F.", role: "manager" });
    expect(me.admin).toMatchObject({
      name: "Sanduni B.",
      role: "admin",
      isOwner: true,
    });
    expect(asked).toEqual(["/auth/me", "/auth/me", "/auth/me"]);
  });

  it("keeps what was done across a switch, and a fresh boot is the starting state again", async () => {
    bootDemo();
    demo.setPerspective("admin");
    const before = (
      await holidayService.listHolidays({
        from: "2020-01-01",
        to: "2040-01-01",
      })
    ).items.length;
    await holidayService.createHoliday({
      date: "2031-03-03",
      name: "Founders' day",
    });
    // Switching perspective is only setPerspective: the store stays.
    demo.setPerspective("manager");
    demo.setPerspective("admin");
    expect(
      (
        await holidayService.listHolidays({
          from: "2020-01-01",
          to: "2040-01-01",
        })
      ).items,
    ).toHaveLength(before + 1);
    // Start over (a new page load) and a refresh both boot again from the fixtures.
    bootDemo();
    demo.setPerspective("admin");
    expect(
      (
        await holidayService.listHolidays({
          from: "2020-01-01",
          to: "2040-01-01",
        })
      ).items,
    ).toHaveLength(before);
  });
});
