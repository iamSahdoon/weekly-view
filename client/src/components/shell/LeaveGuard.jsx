import { useBlocker } from "react-router-dom";
import { useUnsavedChanges } from "../../hooks/useUnsavedGuard.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.jsx";

// Asks before an in-app navigation to another page discards something unsaved
// (frontend_architecture.md §2: UnsavedChangesContext guards navigation). Changing
// only the query — another day or week on the same page — never asks: the page keeps
// its drafts. Day drafts never ask here: they live for the session (owner, C4). Tab
// close is the browser's prompt, armed by UnsavedChangesProvider.
export function LeaveGuard() {
  const { losesOnNavigate } = useUnsavedChanges();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && losesOnNavigate(),
  );
  const open = blocker.state === "blocked";
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && open) blocker.reset();
      }}
      title="Leave this page?"
      confirmLabel="Leave"
      onConfirm={() => blocker.proceed()}
    >
      What you’ve written and not posted will be lost.
    </ConfirmDialog>
  );
}
