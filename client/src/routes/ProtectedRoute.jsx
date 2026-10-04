import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppBootSplash } from "../components/shell/AppBootSplash.jsx";
import { useAuth } from "../hooks/useAuth.js";
import ForbiddenPage from "../pages/ForbiddenPage.jsx";

// A layout route (frontend_architecture.md §4.1; supersedes the redirect in
// tech_stack.md §6.4 — FA2). Signed out → the sign-in path. Signed in without the
// role → the 403 state, inside the shell. UX only: the server's authorize
// middleware is the enforcement.
export default function ProtectedRoute({ allow }) {
  const { user, status, signInPath } = useAuth();
  const location = useLocation();
  if (status === "loading") return <AppBootSplash />;
  if (!user)
    return <Navigate to={signInPath} replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role))
    return <ForbiddenPage allow={allow} />;
  return <Outlet />;
}
