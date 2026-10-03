// Ordered lowest to highest: admin ⊃ manager ⊃ member, via the authorize() hierarchy.
export const ROLES = Object.freeze(["member", "manager", "admin"]);
