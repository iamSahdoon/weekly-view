import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../../../context/AuthContext.jsx";
import { NAV_MARK_KEYS } from "../../../hooks/useNewMarks.js";
import { NAV_GROUPS } from "../navItems.js";
import { Sidebar } from "../Sidebar.jsx";

// The sidebar's markers (design §6.24): a 6×6 "new" square at the right edge of the item
// whose page holds something new, and the Review desk's count — a number only there.

const person = (role) => ({ _id: "66f1a1b2c3d4e5f6a7b8c9d0", name: "T", role });
function sidebar(role, marks) {
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{ status: "authenticated", user: person(role), signOut() {} }}
    >
      <MemoryRouter>
        <Sidebar mode="full" onToggleCollapsed={() => {}} marks={marks} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
const markers = (html) => html.match(/aria-label="New"/g)?.length ?? 0;

describe("Sidebar markers", () => {
  it("shows nothing marked by default", () => {
    expect(markers(sidebar("manager", {}))).toBe(0);
    expect(sidebar("manager", {})).not.toContain("waiting,");
  });

  it("puts a dot on the item the mark names, and only there", () => {
    const html = sidebar("member", { thisWeek: true });
    expect(markers(html)).toBe(1);
    expect(html).toMatch(/This week.*aria-label="New"/s);
    expect(
      markers(sidebar("member", { thisWeek: true, myReports: true })),
    ).toBe(2);
  });

  it("shows the review desk count above zero, as a number, with a spoken form", () => {
    const html = sidebar("manager", { reviewDesk: 3 });
    expect(html).toContain("3 waiting, ");
    expect(sidebar("manager", { reviewDesk: 0 })).not.toContain("waiting,");
  });

  it("never offers a member the count, whatever the marks say", () => {
    expect(sidebar("member", { reviewDesk: 3 })).not.toContain("waiting,");
  });

  it("every dot and count the nav names is a key the marks hook supplies", () => {
    const named = NAV_GROUPS.flatMap((g) => g.items)
      .flatMap((item) => [item.dot, item.count])
      .filter(Boolean);
    expect(named.length).toBeGreaterThan(0);
    for (const key of named) expect(NAV_MARK_KEYS).toContain(key);
  });
});
