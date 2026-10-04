import { describe, expect, it } from "vitest";
import { authReducer, initialAuthState } from "../authReducer.js";

const user = {
  _id: "000000000000000000000a01",
  name: "Imali J.",
  role: "member",
};

describe("authReducer", () => {
  it("ignores SESSION_EXPIRED during boot — a stale token is not a modal", () => {
    const state = authReducer(initialAuthState, { type: "SESSION_EXPIRED" });
    expect(state.sessionExpired).toBe(false);
    expect(authReducer(state, { type: "BOOTED_ANONYMOUS" })).toMatchObject({
      status: "unauthenticated",
      user: null,
      sessionExpired: false,
    });
  });

  it("opens the modal for a working session and keeps the person", () => {
    const signedIn = authReducer(initialAuthState, { type: "BOOTED", user });
    const expired = authReducer(signedIn, { type: "SESSION_EXPIRED" });
    expect(expired).toMatchObject({
      status: "authenticated",
      user,
      sessionExpired: true,
    });
    expect(authReducer(expired, { type: "SIGNED_IN", user })).toMatchObject({
      sessionExpired: false,
    });
  });

  it("signs out to an empty state", () => {
    const signedIn = authReducer(initialAuthState, { type: "SIGNED_IN", user });
    expect(authReducer(signedIn, { type: "SIGNED_OUT" })).toEqual({
      ...initialAuthState,
      status: "unauthenticated",
    });
  });
});
