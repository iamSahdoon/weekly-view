import { subWeeks } from "date-fns";

// Hard-coded demo data (tech_stack.md §6.9). Dates are relative to the moment the
// demo starts, so it never shows a stale week. C1 holds the three perspectives
// only; the stages that build each feature add its fixtures (C10 completes the
// cast of brand §10).

export const PERSPECTIVES = Object.freeze({
  member: "000000000000000000000a01",
  manager: "000000000000000000000a02",
  admin: "000000000000000000000a03",
});

export function buildFixtures(now = new Date()) {
  const joined = subWeeks(now, 26).toISOString();
  return {
    users: [
      {
        _id: PERSPECTIVES.member,
        name: "Imali J.",
        email: "imali@example.com",
        role: "member",
        status: "active",
        isOwner: false,
        onLeave: false,
        joinedAt: joined,
        projectIds: [],
      },
      {
        _id: PERSPECTIVES.manager,
        name: "Nadia F.",
        email: "nadia@example.com",
        role: "manager",
        status: "active",
        isOwner: false,
        onLeave: false,
        joinedAt: joined,
        projectIds: [],
      },
      {
        _id: PERSPECTIVES.admin,
        name: "Sanduni B.",
        email: "sanduni@example.com",
        role: "admin",
        status: "active",
        isOwner: true,
        onLeave: false,
        joinedAt: joined,
        projectIds: [],
      },
    ],
    projects: [],
  };
}
