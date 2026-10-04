import { describe, expect, it } from "vitest";
import { groupsForRole } from "../navItems.js";

const labels = (role) =>
  groupsForRole(role).flatMap((g) => g.items.map((i) => i.label));

describe("navItems", () => {
  it("gives a member three destinations and no manager or admin item", () => {
    expect(labels("member")).toEqual([
      "This week",
      "My reports",
      "Team updates",
    ]);
  });

  it("adds Review and Team for a manager, and Admin for an admin only", () => {
    expect(labels("manager")).toEqual([
      "Review desk",
      "Team dashboard",
      "People",
      "Projects",
      "This week",
      "My reports",
      "Team updates",
    ]);
    expect(labels("admin")).toEqual([
      ...labels("manager").slice(0, 4),
      "Users",
      "Holidays",
      ...labels("manager").slice(4),
    ]);
  });

  it("puts My work first for members and last for managers and admins", () => {
    expect(groupsForRole("member")[0].id).toBe("work");
    expect(groupsForRole("manager").at(-1).id).toBe("work");
    expect(groupsForRole("admin").at(-1).id).toBe("work");
  });

  it("returns nothing for an unknown role", () => {
    expect(labels("owner")).toEqual([]);
  });
});
