import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUnsavedGuard } from "../hooks/useUnsavedGuard.js";

// Unposted day text, in memory only (frontend_architecture.md §2, §6.3): keyed
// `weekKey:weekday`, never written to the device. Mounted for the signed-in session
// (SessionLayout), so drafts survive moving between pages and end at sign-out
// (owner decision, C4). A draft is either *saved* (the
// panel's Save) or not — text carried over a day switch is kept but still counts as
// unsaved, so the tab-close and leave-page guards still ask.

const DayDraftsContext = createContext(null);

export const draftKey = (weekKey, weekday) => `${weekKey}:${weekday}`;

export function DayDraftsProvider({ children }) {
  const drafts = useRef(new Map());
  // How many drafts are unsaved, so the guard re-registers when it changes.
  const [unsaved, setUnsaved] = useState(0);
  const recount = useCallback(() => {
    let n = 0;
    for (const draft of drafts.current.values()) if (!draft.saved) n += 1;
    setUnsaved(n);
  }, []);

  useUnsavedGuard(unsaved > 0, { keepsOnNavigate: true });

  const value = useMemo(
    () => ({
      get: (key) => drafts.current.get(key) ?? null,
      set: (key, values, { saved }) => {
        drafts.current.set(key, { values, saved });
        recount();
      },
      remove: (key) => {
        drafts.current.delete(key);
        recount();
      },
      has: (key) => drafts.current.has(key),
    }),
    [recount],
  );

  return (
    <DayDraftsContext.Provider value={value}>
      {children}
    </DayDraftsContext.Provider>
  );
}

export function useDayDrafts() {
  return useContext(DayDraftsContext);
}
