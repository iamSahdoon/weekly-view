// Which screen an auth page shows after a request that creates an account (A2) or uses a
// link (A8) got no response (owner report, 2026-10-17). A restart mid-request can save the
// account and lose only the answer; the browser then says it couldn't reach the server.
// Pure, so the pages' choice is tested without a browser.

/**
 * /signup: "pending" | "error" | "open" | "closed" | "lost". `bootstrap` is the A1 query
 * ({ isPending, isError, data }); `lostEmail` is the email of a sign-up whose response
 * never arrived, or null. A failed re-check keeps the form when the first check answered.
 */
export function signUpScreen(bootstrap, lostEmail) {
  const available = bootstrap.data?.available;
  if (lostEmail && available === false) return "lost";
  if (bootstrap.isPending) return "pending";
  if (bootstrap.isError && !bootstrap.data) return "error";
  return available ? "open" : "closed";
}

/**
 * /invite/:token and /reset/:token after A8 failed: "lost" when the link is used up and an
 * earlier try got no response, "expired" when it is used up otherwise, else null (the form
 * stays, with its error).
 */
export function linkFailureScreen(error, responseLost) {
  if (error?.code !== "LINK_INVALID") return null;
  return responseLost ? "lost" : "expired";
}
