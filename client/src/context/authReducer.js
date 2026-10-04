// AuthContext's reducer (frontend_architecture.md §3.3). `bootFailed` is the one
// addition: boot gave up after its retries and shows `Try again`.

export const initialAuthState = {
  status: "loading", // "loading" | "authenticated" | "unauthenticated"
  user: null,
  sessionExpired: false,
  bootFailed: false,
};

export function authReducer(state, action) {
  switch (action.type) {
    case "BOOT_RETRY":
      return { ...state, status: "loading", bootFailed: false };
    case "BOOT_FAILED":
      return { ...state, bootFailed: true };
    case "BOOTED":
      return {
        ...state,
        status: "authenticated",
        user: action.user,
        bootFailed: false,
      };
    case "BOOTED_ANONYMOUS":
      return {
        ...state,
        status: "unauthenticated",
        user: null,
        bootFailed: false,
      };
    case "SIGNED_IN":
      return {
        ...state,
        status: "authenticated",
        user: action.user,
        sessionExpired: false,
        bootFailed: false,
      };
    case "USER_UPDATED":
      return { ...state, user: action.user };
    case "SESSION_EXPIRED":
      // Only a session that was working shows the modal. At boot, a stale token's
      // 401 is handled by BOOTED_ANONYMOUS — there is no page to put a modal over.
      return state.status === "authenticated"
        ? { ...state, sessionExpired: true }
        : state;
    case "SIGNED_OUT":
      return { ...initialAuthState, status: "unauthenticated" };
    default:
      return state;
  }
}
