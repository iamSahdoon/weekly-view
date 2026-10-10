import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

/**
 * True under /demo. Read only by presentation that the demo adds (the SAMPLE DATA pill,
 * frontend_architecture.md §11.3) — never to branch on data. Outside an AuthProvider
 * (a component rendered alone) it is false.
 */
export function useIsDemo() {
  return useContext(AuthContext)?.isDemo ?? false;
}
