import { useContext, useEffect, useId } from "react";
import { UnsavedChangesContext } from "../context/UnsavedChangesContext.jsx";

/**
 * Registers a form's dirty state with UnsavedChangesContext while it is mounted.
 * `keepsOnNavigate`: what it holds survives a move to another page (the day drafts),
 * so only tab close, sign-out and the re-auth dismiss ask.
 */
export function useUnsavedGuard(isDirty, { keepsOnNavigate = false } = {}) {
  const id = useId();
  const { setDirty } = useContext(UnsavedChangesContext);
  useEffect(() => {
    setDirty(id, isDirty, { keepsOnNavigate });
    return () => setDirty(id, false);
  }, [id, isDirty, keepsOnNavigate, setDirty]);
}

/** Read access for the places that ask before leaving (sign-out, the re-auth modal). */
export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
