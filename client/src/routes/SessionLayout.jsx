import { Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import AppShell from "../layouts/AppShell.jsx";

// AppShell when signed in, a bare outlet when not (frontend_architecture.md §4.1).
// One layout, so a signed-in person moving from "/" to "/reports" does not remount
// the shell, and "/" can be the landing page without one.
export default function SessionLayout() {
  const { user } = useAuth();
  return user ? <AppShell /> : <Outlet />;
}
