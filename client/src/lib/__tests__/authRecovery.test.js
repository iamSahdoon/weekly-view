import { describe, expect, it } from "vitest";
import { linkFailureScreen, signUpScreen } from "../authRecovery.js";
import { normalizeError } from "../normalizeError.js";

// Owner report (2026-10-17): on a fresh database the first sign-up said "Couldn't reach the
// server", the second "This team is invite-only" — the account had been created and only
// the answer was lost. These are the pages' choices after such a failure.

const query = (data, { isPending = false, isError = false } = {}) => ({
  data,
  isPending,
  isError,
});
// What axios rejects with when no response arrives (a reset connection, a restart).
const noResponse = normalizeError(
  Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" }),
);
const linkInvalid = { code: "LINK_INVALID", isNetwork: false };

describe("signUpScreen", () => {
  it("a request with no response is marked as network, not as a server answer", () => {
    expect(noResponse.isNetwork).toBe(true);
    expect(noResponse.message).toBe("Couldn't reach the server.");
  });

  it("the usual states are unchanged", () => {
    expect(signUpScreen(query(undefined, { isPending: true }), null)).toBe(
      "pending",
    );
    expect(signUpScreen(query(undefined, { isError: true }), null)).toBe(
      "error",
    );
    expect(signUpScreen(query({ available: true }), null)).toBe("open");
    expect(signUpScreen(query({ available: false }), null)).toBe("closed");
  });

  it("lost response, then the re-check says closed: the account may exist — not 'invite-only'", () => {
    expect(signUpScreen(query({ available: false }), "owner@example.com")).toBe(
      "lost",
    );
  });

  it("lost response, then a second press answers SIGNUP_CLOSED (the cache flips to closed): the same", () => {
    // useSignUp writes { available: false } on SIGNUP_CLOSED; the lost email is still held.
    expect(signUpScreen(query({ available: false }), "owner@example.com")).toBe(
      "lost",
    );
  });

  it("lost response, but sign-up is still open (nothing was written): the form stays, to try again", () => {
    expect(signUpScreen(query({ available: true }), "owner@example.com")).toBe(
      "open",
    );
  });

  it("lost response and the re-check fails too: the form stays, with what was typed", () => {
    expect(
      signUpScreen(
        query({ available: true }, { isError: true }),
        "owner@example.com",
      ),
    ).toBe("open");
  });

  it("someone else signed up first (no lost response): invite-only, as before", () => {
    expect(signUpScreen(query({ available: false }), null)).toBe("closed");
  });
});

describe("linkFailureScreen (accept invite, reset password)", () => {
  it("a used link after a lost response: the account or password may already be saved", () => {
    expect(linkFailureScreen(linkInvalid, true)).toBe("lost");
  });

  it("a used link otherwise: the one expired state", () => {
    expect(linkFailureScreen(linkInvalid, false)).toBe("expired");
  });

  it("any other error keeps the form", () => {
    expect(linkFailureScreen(noResponse, true)).toBeNull();
    expect(linkFailureScreen(null, false)).toBeNull();
  });
});
