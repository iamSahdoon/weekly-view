import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Sidebar } from "../../components/shell/Sidebar.jsx";
import { AuthContext } from "../../context/AuthContext.jsx";
import { PageChromeProvider } from "../../context/PageChromeContext.jsx";
import ParamGuard from "../ParamGuard.jsx";
import ProtectedRoute from "../ProtectedRoute.jsx";

// The guards are UX, not enforcement (the server is), but the nav must never carry
// an item the person can't use: "no manager nav item exists in the DOM".

const ME = "66f1a1b2c3d4e5f6a7b8c9d0";
const person = (role) => ({
  _id: ME,
  name: "Test Person",
  role,
  status: "active",
});

function auth(role) {
  return {
    status: role ? "authenticated" : "unauthenticated",
    user: role ? person(role) : null,
    isDemo: false,
    signInPath: "/signin",
    signOut() {},
  };
}

function render(role, path, routes) {
  return renderToStaticMarkup(
    <AuthContext.Provider value={auth(role)}>
      <PageChromeProvider>
        <MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>
      </PageChromeProvider>
    </AuthContext.Provider>,
  );
}

const guardedRoutes = (
  <Routes>
    <Route element={<ProtectedRoute allow={["manager", "admin"]} />}>
      <Route path="/review" element={<p>REVIEW DESK CONTENT</p>} />
    </Route>
    <Route element={<ProtectedRoute allow={["admin"]} />}>
      <Route path="/users" element={<p>USERS CONTENT</p>} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route path="/updates" element={<p>UPDATES CONTENT</p>} />
    </Route>
  </Routes>
);

describe("ProtectedRoute", () => {
  it("shows a member the 403 state instead of the manager page", () => {
    const html = render("member", "/review", guardedRoutes);
    expect(html).not.toContain("REVIEW DESK CONTENT");
    expect(html).toContain("You don’t have access to this page.");
    expect(html).toContain("This area is for managers.");
  });

  it("words the line for admins from `allow`, and lets a manager into /review", () => {
    expect(render("manager", "/users", guardedRoutes)).toContain(
      "This area is for admins.",
    );
    expect(render("manager", "/review", guardedRoutes)).toContain(
      "REVIEW DESK CONTENT",
    );
    expect(render("admin", "/users", guardedRoutes)).toContain("USERS CONTENT");
  });

  it("lets every role into a route with no `allow`", () => {
    for (const role of ["member", "manager", "admin"]) {
      expect(render(role, "/updates", guardedRoutes)).toContain(
        "UPDATES CONTENT",
      );
    }
  });
});

describe("ParamGuard", () => {
  const routes = (
    <Routes>
      <Route
        path="/reports/:week"
        element={
          <ParamGuard names={["week"]}>
            <p>THE WEEK</p>
          </ParamGuard>
        }
      />
    </Routes>
  );

  it("renders the page for a real weekKey and the not-found page for a bad one", () => {
    expect(render("member", "/reports/2026-W40", routes)).toContain("THE WEEK");
    const bad = render("member", "/reports/2026-W99", routes);
    expect(bad).not.toContain("THE WEEK");
    expect(bad).toContain("That page doesn’t exist.");
  });
});

describe("Sidebar", () => {
  const sidebar = (role, path = "/") =>
    render(role, path, <Sidebar mode="full" onToggleCollapsed={() => {}} />);

  it("has no manager or admin item in a member's DOM", () => {
    const html = sidebar("member");
    for (const label of [
      "Review desk",
      "Team dashboard",
      "People",
      "Projects",
      "Users",
      "Holidays",
    ]) {
      expect(html).not.toContain(label);
    }
    for (const label of ["This week", "My reports", "Team updates"]) {
      expect(html).toContain(label);
    }
  });

  it("shows a manager Review and Team but not Admin, and an admin all of it", () => {
    const manager = sidebar("manager");
    expect(manager).toContain("Review desk");
    expect(manager).toContain("Projects");
    expect(manager).not.toContain("Holidays");
    expect(sidebar("admin")).toContain("Holidays");
  });

  it("marks one item current, and keeps People lit on a person's week", () => {
    const html = sidebar("manager", `/people/${ME}/reports/2026-W38`);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*>(?:(?!<\/a>).)*People/s);
  });

  it("marks This week on the edit route, not My reports", () => {
    const html = sidebar("member", "/reports/2026-W40/edit");
    expect(html).toMatch(/aria-current="page"[^>]*>(?:(?!<\/a>).)*This week/s);
  });
});
