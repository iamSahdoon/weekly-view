import { createContext, useCallback, useMemo, useRef } from "react";

// The registry of dirty forms (frontend_architecture.md §2). C1 needs only the
// question "is anything unsaved?" for the session-expiry modal's dismiss; the
// navigation and tab-close guards built on it come with the forms (C4).
export const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const dirty = useRef(new Set());

  const setDirty = useCallback((id, isDirty) => {
    if (isDirty) dirty.current.add(id);
    else dirty.current.delete(id);
  }, []);

  const hasUnsavedChanges = useCallback(() => dirty.current.size > 0, []);

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
