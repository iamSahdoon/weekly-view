import { InlineError } from "./InlineError.jsx";
import { cn } from "../../lib/cn.js";

// The four designed states around a TanStack result (frontend_architecture.md
// §8.4; design §11 rule 10). The query is passed in, never imported. The caller
// decides which empty it is (new or filtered) by what it passes as `empty`.
//
//   skeleton  query.isPending — first load only, layout-matched, never a spinner
//   empty     isEmpty(data)
//   error     query.isError with no data yet — the filter bar and headers stay live
//             around it. A failed background refetch keeps the loaded data on screen.
//   content   otherwise; dimmed with aria-busy while refetching over placeholder data

export function QueryView({
  query,
  skeleton,
  isEmpty,
  empty,
  error,
  children,
}) {
  if (query.isPending) return skeleton ?? null;
  if (query.isError && query.data === undefined) {
    return (
      error ?? (
        <InlineError title="This didn't load." onRetry={() => query.refetch()}>
          Check your connection and try again.
        </InlineError>
      )
    );
  }
  if (isEmpty?.(query.data)) return empty ?? null;
  const dimmed = query.isFetching && query.isPlaceholderData;
  return (
    <div
      aria-busy={dimmed || undefined}
      className={cn(
        "transition-opacity duration-[120ms] ease-linear",
        dimmed && "opacity-60",
      )}
    >
      {children(query.data)}
    </div>
  );
}
