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
import { qk } from "../../lib/queryKeys.js";
import * as dashboardService from "../../services/dashboardService.js";
import { apiClient } from "../../services/apiClient.js";
import * as holidayService from "../../services/holidayService.js";
import * as projectService from "../../services/projectService.js";
import * as userService from "../../services/userService.js";
import AccountPage from "../AccountPage.jsx";
import HolidaysPage from "../HolidaysPage.jsx";
import PeoplePage from "../PeoplePage.jsx";
import PersonProfilePage from "../PersonProfilePage.jsx";
import ProjectsPage from "../ProjectsPage.jsx";
import UsersPage from "../UsersPage.jsx";

// The C8 pages as static renders over the demo's answers on a frozen Wednesday (2026-W41):
// what each shows to whom, and the rules a click would meet. What a click does — the
// modals, the link state, the inline role change — is walked through in a real browser
// against the real API and recorded in PROGRESS.md; the rules behind those clicks are
// tested in lib/__tests__/permissions.test.js and demo/__tests__/demoPeople.test.js.

const THIS = "2026-W41";
const { member: IMALI, manager: NADIA, admin: SANDUNI } = PERSPECTIVES;
let store;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
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
const LIST = { sort: "name", dir: "asc", page: 1, limit: 20 };

function render(role, client, path, route, element) {
  const me = as(role);
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        status: "authenticated",
        user: meOf(store, me),
        isDemo: false,
        signInPath: "/signin",
        setUser() {},
        signIn() {},
      }}
    >
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={route} element={element} />
            </Routes>
          </MemoryRouter>
        </PageChromeProvider>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

describe("Projects", () => {
  async function primed() {
    as("manager");
    const client = newClient();
    client.setQueryData(
      qk.projects({ status: "active" }),
      await projectService.listProjects({ status: "active" }),
    );
    client.setQueryData(
      qk.users({ status: "active", limit: 100 }),
      await userService.listUsers({ status: "active", limit: 100 }),
    );
    return client;
  }

  it("lists each project with its plan, an Extend plan or Set plan action, and Edit and Delete", async () => {
    const client = await primed();
    // A project with no plan says so and offers Set plan.
    as("manager");
    await projectService.createProject({ name: "Bare" });
    client.setQueryData(
      qk.projects({ status: "active" }),
      await projectService.listProjects({ status: "active" }),
    );
    const html = render(
      "manager",
      client,
      "/projects",
      "/projects",
      <ProjectsPage />,
    );
    expect(html).toContain("What the team’s work belongs to");
    for (const name of ["Client A", "R&amp;D", "Bare"])
      expect(html).toContain(name);
    expect(html).toContain("No plan");
    expect(html).toContain("Set plan for Bare");
    expect(html).toContain("Extend plan for Client A");
    expect(html).toContain("Edit Client A");
    expect(html).toContain("Delete Client A");
    expect(html).toContain("Show progress in");
    // R&D's 25 days ran out last week: stated in words, in the Needs-correction colour.
    expect(html).toMatch(/overdue by \d+ days?/);
    expect(html).toContain("text-st-corr-fg");
  });

  it("switches to hours from the URL", async () => {
    const client = await primed();
    const html = render(
      "manager",
      client,
      "/projects?unit=hours",
      "/projects",
      <ProjectsPage />,
    );
    expect(html).toContain("h of 300 h");
  });

  it("shows the empty state of a team with no project", () => {
    as("manager");
    const client = newClient();
    client.setQueryData(qk.projects({ status: "active" }), { items: [] });
    client.setQueryData(qk.users({ status: "active", limit: 100 }), {
      items: [],
      meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
    });
    const html = render(
      "manager",
      client,
      "/projects",
      "/projects",
      <ProjectsPage />,
    );
    expect(html).toContain("No projects yet.");
    expect(html).toContain(
      "Projects are what the team’s tasks and hours belong to.",
    );
  });
});

describe("Holidays", () => {
  it("lists a year's holidays with who added them, and the empty state when there are none", async () => {
    as("admin");
    await holidayService.createHoliday({
      date: "2026-09-17",
      name: "Vesak Poya",
    });
    const client = newClient();
    client.setQueryData(
      qk.holidays(2026),
      await holidayService.listHolidays({
        from: "2026-01-01",
        to: "2026-12-31",
      }),
    );
    const html = render(
      "admin",
      client,
      "/holidays",
      "/holidays",
      <HolidaysPage />,
    );
    expect(html).toContain("Thu 17 Sep 2026");
    expect(html).toContain("Vesak Poya");
    expect(html).toContain("Sanduni B.");
    expect(html).toContain("On a holiday, no one needs to post an update");
    expect(html).toContain("Edit Vesak Poya");

    const empty = newClient();
    empty.setQueryData(qk.holidays(2026), { items: [] });
    const html2 = render(
      "admin",
      empty,
      "/holidays",
      "/holidays",
      <HolidaysPage />,
    );
    expect(html2).toContain("No holidays for 2026.");
    expect(html2).toContain("Add the days the whole team is off.");
  });
});

describe("Users", () => {
  async function primed(role = "admin") {
    as(role);
    const client = newClient();
    client.setQueryData(qk.users(LIST), await userService.listUsers(LIST));
    client.setQueryData(
      qk.projects({ status: "active" }),
      await projectService.listProjects({ status: "active" }),
    );
    return client;
  }

  it("shows the owner's row with the Owner chip and rows the viewer can't change as disabled with their reason", async () => {
    // Make a second admin so a non-owner admin is looking at the owner and at another admin.
    as("admin");
    await userService.inviteUser({ email: "new@example.com", role: "member" });
    store.users.find((u) => u._id === NADIA).role = "admin";
    const client = await primed("manager"); // Nadia, now an admin who is not the owner
    const html = render("manager", client, "/users", "/users", <UsersPage />);
    expect(html).toContain("Owner");
    expect(html).toContain("The owner can&#x27;t be changed by other admins.");
    expect(html).toContain("You can&#x27;t change your own role.");
    // An invited person has no name: the email stands in, with the invite's expiry.
    expect(html).toContain("new@example.com");
    expect(html).toMatch(/Invited · expires \d+ \w+/);
  });

  it("lets the owner change an admin's role: no reason on the row", async () => {
    as("admin");
    store.users.find((u) => u._id === NADIA).role = "admin";
    const client = await primed("admin"); // Sanduni, the owner
    const html = render("admin", client, "/users", "/users", <UsersPage />);
    expect(html).not.toContain("Only the owner can change another admin");
    expect(html).toContain("Role of Nadia F.");
  });

  it("puts the On leave chip beside a name, and says so in the empty-filtered state", async () => {
    as("admin");
    await userService.setLeave(IMALI, true);
    const client = await primed("admin");
    const html = render("admin", client, "/users", "/users", <UsersPage />);
    expect(html).toContain("On leave");

    const none = newClient();
    none.setQueryData(qk.users({ ...LIST, role: "admin", q: "zzz" }), {
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    none.setQueryData(qk.projects({ status: "active" }), { items: [] });
    const html2 = render(
      "admin",
      none,
      "/users?q=zzz&role=admin",
      "/users",
      <UsersPage />,
    );
    expect(html2).toContain("No people match these filters.");
    expect(html2).toContain("Clear filters");
  });
});

describe("People", () => {
  const PEOPLE = { ...LIST, status: "active" };
  async function primed(role = "manager", params = PEOPLE) {
    as(role);
    const client = newClient();
    client.setQueryData(qk.users(params), await userService.listUsers(params));
    client.setQueryData(
      qk.projects({ status: "active" }),
      await projectService.listProjects({ status: "active" }),
    );
    return client;
  }

  it("links each active person to their week by the addresses Team updates uses", async () => {
    const client = await primed();
    const html = render(
      "manager",
      client,
      "/people",
      "/people",
      <PeoplePage />,
    );
    // Yours is /reports/:week; anyone else's /people/:id/reports/:week.
    expect(html).toContain(`href="/reports/${THIS}"`);
    expect(html).toContain(`href="/people/${IMALI}/reports/${THIS}"`);
    expect(html).toContain(`href="/people/${SANDUNI}/reports/${THIS}"`);
    // The row itself opens the profile.
    expect(html).toContain(`href="/people/${IMALI}"`);
    for (const header of [
      "Person",
      "Role",
      "Projects",
      "Reports filed",
      "Last activity",
      "Status",
    ])
      expect(html).toContain(header);
  });

  it("offers Manage users to an admin only", async () => {
    // The button sits in the top bar's portal, which a static render doesn't mount; the
    // empty state carries the same rule, so it is read there.
    for (const [role, expected] of [
      ["admin", true],
      ["manager", false],
    ]) {
      as(role);
      const alone = newClient();
      alone.setQueryData(qk.users(PEOPLE), {
        items: [
          {
            ...(await userService.listUsers(PEOPLE)).items.find(
              (u) => u._id === PERSPECTIVES[role],
            ),
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      alone.setQueryData(qk.projects({ status: "active" }), { items: [] });
      const html = render(role, alone, "/people", "/people", <PeoplePage />);
      expect(html).toContain("No one else on the team yet.");
      expect(html.includes("Manage users")).toBe(expected);
    }
  });

  it("shows the note when a search surfaces someone the status filter would have hidden", async () => {
    as("admin");
    await userService.removeUser(IMALI);
    // q set: the request has no status, so the removed person comes back.
    const search = { ...LIST, q: "imali" };
    const client = await primed("manager", search);
    const html = render(
      "manager",
      client,
      "/people?q=imali",
      "/people",
      <PeoplePage />,
    );
    expect(html).toContain("Showing matches in all statuses.");
    expect(html).toContain("Removed");
    // The status control still shows its value, so clearing the search restores the filter.
    expect(html).toMatch(/<option value="active" selected/);
  });

  it("has no note without a search, and none with All statuses", async () => {
    const client = await primed();
    expect(
      render("manager", client, "/people", "/people", <PeoplePage />),
    ).not.toContain("Showing matches in all statuses.");
  });
});

describe("Person profile", () => {
  async function primed(role = "manager", id = IMALI) {
    as(role);
    const client = newClient();
    const params = { sort: "weekKey", dir: "desc", page: 1, limit: 20 };
    client.setQueryData(qk.user(id), await userService.getUser(id));
    client.setQueryData(
      qk.reportsOf(id, params),
      await userService.listUserReports(id, params),
    );
    client.setQueryData(
      qk.dashboard.person(id),
      await dashboardService.getPersonMetrics(id),
    );
    client.setQueryData(
      qk.week(id, THIS),
      await userService.getUserWeek(id, THIS),
    );
    return client;
  }
  const page = (role, client, id = IMALI) =>
    render(
      role,
      client,
      `/people/${id}`,
      "/people/:userId",
      <PersonProfilePage />,
    );

  it("shows the header, the four figures and every week, away weeks included but not clickable", async () => {
    const client = await primed();
    const html = page("manager", client);
    expect(html).toContain("Imali J.");
    expect(html).toContain("imali@example.com");
    expect(html).toContain("Client A, R&amp;D");
    expect(html).toMatch(/Joined \d+ \w+ \d{4}/);
    for (const label of [
      "Reports filed",
      "Compliance",
      "Avg hours / week",
      "Corrections",
    ])
      expect(html).toContain(label);
    // A week with a report opens that person's week; one without is a chip and a dash.
    expect(html).toContain(`href="/people/${IMALI}/reports/${THIS}"`);
    expect(html).toContain("Not started");
    expect(html).not.toContain('href="/people/' + IMALI + '/reports/2026-W38"');
    expect(html).toContain("Needs correction");
    expect(html).toContain("Approved");
  });

  it("shows this week's posting as the Updates squares and a link to the week", async () => {
    const client = await primed();
    const html = page("manager", client);
    expect(html).toContain('aria-label="This week"');
    expect(html).toContain('data-state="posted"');
    expect(html).toContain(`href="/people/${IMALI}/reports/${THIS}"`);
    expect(html).toContain("Open W41");
  });

  it("shows the leave history with each period's start, end and who set it", async () => {
    as("manager");
    await userService.setLeave(IMALI, true);
    as("admin");
    await userService.setLeave(IMALI, false);
    as("member");
    await userService.setLeave(IMALI, true);
    const client = await primed("manager");
    const html = page("manager", client);
    expect(html).toContain("Leave history");
    expect(html).toContain("Ongoing");
    expect(html).toContain("Nadia F.");
    expect(html).toContain("Themselves");
    // The On leave chip with "since …" beside the name.
    expect(html).toContain("On leave");
    expect(html).toMatch(/since \d+ \w+/);
  });

  it("says when there has been no leave", async () => {
    const client = await primed();
    expect(page("manager", client)).toContain("No leave on record.");
  });

  it("is not found for a person who doesn't exist", () => {
    as("manager");
    const client = newClient();
    const ghost = "0a00000000000000000000ff";
    client.setQueryData(qk.user(ghost), undefined);
    const html = page("manager", client, ghost);
    expect(html).not.toContain("Reports filed"); // pending: the skeleton, no figures
  });
});

describe("Account", () => {
  // The Appearance control reads the theme off the document; a static render has none.
  beforeAll(() => {
    globalThis.document = { documentElement: { dataset: {} } };
  });
  afterAll(() => {
    delete globalThis.document;
  });
  const html = (role) => {
    const client = newClient();
    return render(role, client, "/account", "/account", <AccountPage />);
  };

  it("names the owner for a member, a manager or an admin, and the Users page for the owner", () => {
    const member = html("member");
    expect(member).toContain("To change your email, ask the owner,");
    expect(member).toContain("or any admin.");
    expect(member).toContain(
      "mailto:sanduni@example.com?subject=Email%20change%20request",
    );
    expect(member).toContain("sanduni@example.com"); // selectable beside the link

    const admin = (() => {
      store.users.find((u) => u._id === SANDUNI).isOwner = false;
      store.users.find((u) => u._id === NADIA).isOwner = true;
      return html("admin");
    })();
    expect(admin).toContain("To change your email, ask the owner,");
    expect(admin).not.toContain("or any admin.");
  });

  it("tells the owner they can change their email on the Users page", () => {
    const owner = html("admin"); // Sanduni is the owner in the fixtures
    expect(owner).toContain("You can change your email on the");
    expect(owner).toContain("Users page");
  });

  it("has the four panels: Profile, Password, Appearance, Leave", () => {
    const out = html("member");
    for (const title of ["Profile", "Password", "Appearance", "Leave"])
      expect(out).toContain(`>${title}<`);
    expect(out).toContain("Applies to this device.");
    expect(out).toContain("Other devices will be signed out.");
    expect(out).toContain("ask an admin for a reset link");
    expect(out).toContain("I’m on leave");
    expect(out).toContain("Display name");
    expect(out).toContain("imali@example.com");
    expect(out).toContain("Client A, R&amp;D");
  });
});
