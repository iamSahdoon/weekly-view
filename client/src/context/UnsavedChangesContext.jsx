import { createContext, useCallback, useEffect, useMemo, useRef } from "react";

// The registry of dirty forms (frontend_architecture.md §2): "is anything unsaved?"
// guards the session-expiry modal's dismiss, sign-out, in-app navigation (LeaveGuard)
// and tab close — the browser's own `beforeunload` prompt, armed here.
export const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const dirty = useRef(new Set());

  const setDirty = useCallback((id, isDirty) => {
    if (isDirty) dirty.current.add(id);
    else dirty.current.delete(id);
  }, []);

  const hasUnsavedChanges = useCallback(() => dirty.current.size > 0, []);

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
    () => ({ setDirty, hasUnsavedChanges }),
    [setDirty, hasUnsavedChanges],
  );
  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}
