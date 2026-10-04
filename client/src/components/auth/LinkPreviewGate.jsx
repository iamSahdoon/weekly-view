import { useLinkPreview } from "../../hooks/useAuthQueries.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { InlineError } from "../ui/InlineError.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { AuthPanel } from "./AuthScreen.jsx";
import { LinkExpired } from "./LinkExpired.jsx";

// A7 before an invite or reset form. Any dead link — and a link of the other
// purpose — is the one expired state. The token stays in component state and the
// query function's closure; it is never part of a key or the cached data.

export function LinkPreviewGate({ token, purpose, children }) {
  const preview = useLinkPreview(token);

  if (preview.isPending) {
    return (
      <AuthPanel>
        <div className="flex flex-col gap-20">
          <Skeleton className="h-[67px]" />
          <Skeleton className="h-[67px]" />
          <Skeleton className="h-[67px]" />
          <Skeleton className="h-[var(--ctrl-h-lg)]" />
        </div>
      </AuthPanel>
    );
  }
  if (preview.isError && preview.error.code !== "LINK_INVALID") {
    return (
      <InlineError
        title={errorCopy(preview.error)}
        onRetry={() => preview.refetch()}
      >
        The link couldn't be checked.
      </InlineError>
    );
  }
  if (preview.isError || preview.data.purpose !== purpose)
    return <LinkExpired />;
  return children(preview.data);
}
