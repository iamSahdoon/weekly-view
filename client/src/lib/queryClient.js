import { QueryClient } from "@tanstack/react-query";

// tech_stack.md §6.3 and frontend_architecture.md §3.2. Mutations never retry:
// a write retried after a timeout can double-post a comment.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
