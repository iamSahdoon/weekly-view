import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import * as authService from "../services/authService.js";
import { useAuth } from "./useAuth.js";

// Auth hooks (frontend_architecture.md §9.15). Passwords and link tokens are
// mutation variables or query-function closures only — never a key, never cached
// past the screen (gcTime: 0).

export function useBootstrapStatus() {
  return useQuery({
    queryKey: qk.bootstrap(),
    queryFn: authService.getBootstrap,
  });
}

export function useLinkPreview(token) {
  return useQuery({
    queryKey: qk.linkPreview(),
    queryFn: () => authService.previewLink({ token }),
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
}

export function useLogin() {
  return useMutation({ mutationFn: authService.login, gcTime: 0 });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.signUp,
    gcTime: 0,
    // Someone else got there first: /signup switches to its closed state.
    onError: (error) => {
      if (error.code === "SIGNUP_CLOSED") {
        queryClient.setQueryData(qk.bootstrap(), { available: false });
      }
    },
  });
}

export function useAcceptLink() {
  return useMutation({ mutationFn: authService.acceptLink, gcTime: 0 });
}

/**
 * The demo chooser (frontend_architecture.md §9.18): `choose(role)` tells the adapter
 * who is asking, then A4 reads that person's Me and the session starts without a token.
 * `choose` comes from the page, which alone may import the demo.
 */
export function useDemoSignIn(choose) {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: async (role) => {
      choose(role);
      return authService.getMe();
    },
    onSuccess: (me) => signIn(null, me),
    gcTime: 0,
  });
}
