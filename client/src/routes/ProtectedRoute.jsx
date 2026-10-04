import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppBootSplash } from "../components/shell/AppBootSplash.jsx";
import { useAuth } from "../hooks/useAuth.js";

// A layout route (frontend_architecture.md §4.1). UX only: the server's
// authorize middleware is the enforcement. `allow` and the in-shell 403 state
// (ForbiddenPage) arrive with the shell in C2.
export default function ProtectedRoute() {
  const { user, status, signInPath } = useAuth();
  const location = useLocation();
  if (status === "loading") return <AppBootSplash />;
  if (!user)
    return <Navigate to={signInPath} replace state={{ from: location }} />;
  return <Outlet />;
}
