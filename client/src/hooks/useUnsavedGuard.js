import { useContext, useEffect, useId } from "react";
import { UnsavedChangesContext } from "../context/UnsavedChangesContext.jsx";

/** Registers a form's dirty state with UnsavedChangesContext while it is mounted. */
export function useUnsavedGuard(isDirty) {
  const id = useId();
  const { setDirty } = useContext(UnsavedChangesContext);
  useEffect(() => {
    setDirty(id, isDirty);
    return () => setDirty(id, false);
  }, [id, isDirty, setDirty]);
}

/** Read access for the places that ask before leaving (sign-out, the re-auth modal). */
export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
