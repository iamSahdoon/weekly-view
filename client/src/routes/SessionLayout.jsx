import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { DayDraftsProvider } from "../context/DayDraftsContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import AppShell from "../layouts/AppShell.jsx";
import { prefetchRoutes } from "./prefetch.js";

// AppShell when signed in, a bare outlet when not (frontend_architecture.md §4.1).
// One layout, so a signed-in person moving from "/" to "/reports" does not remount
// the shell, and "/" can be the landing page without one. Unposted day drafts live
// here, for the whole signed-in session; signing out unmounts them (owner, C4).
export default function SessionLayout() {
  const { user } = useAuth();
  // Once someone is signed in and the shell has painted, fetch the pages they may open next.
  const role = user?.role;
  useEffect(() => (role ? prefetchRoutes(role) : undefined), [role]);
  return user ? (
    <DayDraftsProvider key={user._id}>
      <AppShell />
    </DayDraftsProvider>
  ) : (
    <Outlet />
  );
}
