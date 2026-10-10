import { Suspense } from "react";
import { Navigate } from "react-router-dom";
import { AppBootSplash } from "../components/shell/AppBootSplash.jsx";
import { BrandMark } from "../components/shell/BrandMark.jsx";
import { RouteFallback } from "../components/shell/RouteFallback.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { ThisWeekPage } from "./pages.js";

// "/" branches on the session (frontend_architecture.md §4.1). Signed in it is
// ThisWeekPage (C4); signed out, the landing page or the demo chooser (C10). Until
// C10 a redirect to /signin stands in; the demo's signed-out entry is a bare
// placeholder.
export default function IndexRoute() {
  const { status, user, isDemo } = useAuth();
  if (status === "loading") return <AppBootSplash />;
  if (user) {
    return (
      <Suspense fallback={<RouteFallback title="This week" kind="panels" />}>
        <ThisWeekPage />
      </Suspense>
    );
  }
  if (!isDemo) return <Navigate to="/signin" replace />;
  return (
    <main className="min-h-[100dvh] bg-paper px-16 py-52">
      <div className="mx-auto max-w-[420px]">
        <BrandMark className="mb-32 text-[20px]" />
      </div>
    </main>
  );
}
