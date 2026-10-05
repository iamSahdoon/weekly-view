import { createContext, useCallback, useEffect, useMemo, useRef } from "react";

// The registry of dirty forms (frontend_architecture.md §2): "is anything unsaved?"
// guards the session-expiry modal's dismiss, sign-out, in-app navigation (LeaveGuard)
// and tab close — the browser's own `beforeunload` prompt, armed here. An entry
// registered with `keepsOnNavigate` (the day drafts, which outlive the page) arms
// every guard but the in-app navigation one.
export const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  // id → { keepsOnNavigate }
  const dirty = useRef(new Map());

  const setDirty = useCallback(
    (id, isDirty, { keepsOnNavigate = false } = {}) => {
      if (isDirty) dirty.current.set(id, { keepsOnNavigate });
      else dirty.current.delete(id);
    },
    [],
  );

  const hasUnsavedChanges = useCallback(() => dirty.current.size > 0, []);

  /** Would leaving this page lose something? (LeaveGuard) */
  const losesOnNavigate = useCallback(
    () => [...dirty.current.values()].some((d) => !d.keepsOnNavigate),
    [],
  );

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (dirty.current.size === 0) return;
      event.preventDefault();
      event.returnValue = ""; // older browsers need it set to show the prompt
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const value = useMemo(
    () => ({ setDirty, hasUnsavedChanges, losesOnNavigate }),
    [setDirty, hasUnsavedChanges, losesOnNavigate],
  );
  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}
