import { Navigate } from "react-router-dom";
import { AppBootSplash } from "../components/shell/AppBootSplash.jsx";
import { BrandMark } from "../components/shell/BrandMark.jsx";
import { useAuth } from "../hooks/useAuth.js";
import PendingPage from "../pages/PendingPage.jsx";

// "/" branches on the session (frontend_architecture.md §4.1). Signed in it will be
// ThisWeekPage (C4); signed out, the landing page or the demo chooser (C10).
// Until those stages, PendingPage (inside the shell) and a redirect to /signin
// stand in; the demo's signed-out entry is a bare placeholder.
export default function IndexRoute() {
  const { status, user, isDemo } = useAuth();
  if (status === "loading") return <AppBootSplash />;
  if (user) return <PendingPage title="This week" />;
  if (!isDemo) return <Navigate to="/signin" replace />;
  return (
    <main className="min-h-[100dvh] bg-paper px-16 py-52">
      <div className="mx-auto max-w-[420px]">
        <BrandMark className="mb-32 text-[20px]" />
      </div>
    </main>
  );
}
