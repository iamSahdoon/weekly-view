import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useSetLeave } from "../../hooks/useUserQueries.js";
import { toastError } from "../../lib/errorToast.js";
import { EndLeaveDialog } from "./EndLeaveDialog.jsx";

// Turning leave on is one click; turning it off asks first (owner decision, C4) —
// `EndLeaveDialog`, worded for the person themselves or for someone else. This owns that
// rule once for every page that offers the toggle (Users, a person's profile, Account):
// `children({ request, pending })` gets `request(person)` — `person` is anything with
// `_id`, `name` and `onLeave` — and the dialog is rendered beside what it returns.

export function LeaveToggleHost({ children }) {
  const { user: me } = useAuth();
  const setLeave = useSetLeave();
  const [ending, setEnding] = useState(null);

  const run = (person, onLeave) =>
    setLeave.mutate(
      { userId: person._id, onLeave },
      {
        onSuccess: () => setEnding(null),
        onError: (error) => {
          setEnding(null);
          toastError(
            onLeave ? "Leave wasn’t turned on." : "Leave wasn’t turned off.",
            error,
            { id: `leave-${person._id}`, retry: () => run(person, onLeave) },
          );
        },
      },
    );
  const request = (person) =>
    person.onLeave ? setEnding(person) : run(person, true);

  return (
    <>
      {children({ request, pending: setLeave.isPending })}
      {ending && (
        <EndLeaveDialog
          open
          person={ending}
          isSelf={ending._id === me._id}
          onOpenChange={(next) => !next && setEnding(null)}
          onConfirm={() => run(ending, false)}
          pending={setLeave.isPending}
        />
      )}
    </>
  );
}
