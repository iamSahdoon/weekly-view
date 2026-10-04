import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { authEvents } from "../lib/authEvents.js";
import { tokenStore } from "../lib/tokenStore.js";
import { getMe } from "../services/authService.js";
import { authReducer, initialAuthState } from "./authReducer.js";

export const AuthContext = createContext(null);

// Boot retries a sleeping server for about a minute (frontend_architecture.md §3.3).
const BOOT_RETRY_DELAYS = [4_000, 8_000, 16_000, 32_000];

export function AuthProvider({ demo = false, children }) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const lastUserId = useRef(null);
  const [bootAttempt, setBootAttempt] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    if (demo || !tokenStore.get()) {
      dispatch({ type: "BOOTED_ANONYMOUS" });
      return;
    }
    let cancelled = false;
    let timer;
    const attempt = (n) => {
      getMe().then(
        (user) => {
          if (cancelled) return;
          lastUserId.current = user._id;
          dispatch({ type: "BOOTED", user });
        },
        (error) => {
          if (cancelled) return;
          if (error.httpStatus === 401) {
            tokenStore.clear();
            dispatch({ type: "BOOTED_ANONYMOUS" });
          } else if (n < BOOT_RETRY_DELAYS.length) {
            // Unreachable or waking: keep the token and try again.
            timer = setTimeout(() => attempt(n + 1), BOOT_RETRY_DELAYS[n]);
          } else {
            dispatch({ type: "BOOT_FAILED" });
          }
        },
      );
    };
    attempt(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [demo, bootAttempt]);

  useEffect(
    () =>
      authEvents.on("session-expired", () =>
        dispatch({ type: "SESSION_EXPIRED" }),
      ),
    [],
  );

  const signIn = useCallback(
    (token, user) => {
      if (!demo) tokenStore.set(token);
      // Nothing from an earlier session may render for a different person.
      if (lastUserId.current && lastUserId.current !== user._id)
        queryClient.clear();
      lastUserId.current = user._id;
      dispatch({ type: "SIGNED_IN", user });
    },
    [demo, queryClient],
  );

  const setUser = useCallback(
    (user) => dispatch({ type: "USER_UPDATED", user }),
    [],
  );

  const signOut = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    lastUserId.current = null;
    // ProtectedRoute redirects; nothing navigates by hand.
    dispatch({ type: "SIGNED_OUT" });
  }, [queryClient]);

  const expireSession = useCallback(
    () => dispatch({ type: "SESSION_EXPIRED" }),
    [],
  );

  const retryBoot = useCallback(() => {
    dispatch({ type: "BOOT_RETRY" });
    setBootAttempt();
  }, []);

  const value = useMemo(() => {
    const role = state.user?.role;
    return {
      ...state,
      isDemo: demo,
      signInPath: demo ? "/" : "/signin",
      isManager: role === "manager" || role === "admin",
      isAdmin: role === "admin",
      isOwner: Boolean(state.user?.isOwner),
      signIn,
      setUser,
      signOut,
      expireSession,
      retryBoot,
    };
  }, [state, demo, signIn, setUser, signOut, expireSession, retryBoot]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
