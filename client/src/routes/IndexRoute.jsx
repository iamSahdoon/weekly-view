import { Suspense } from "react";
import { AppBootSplash } from "../components/shell/AppBootSplash.jsx";
import { RouteFallback } from "../components/shell/RouteFallback.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { DemoEntryPage, LandingPage, ThisWeekPage } from "./pages.js";

// "/" branches on the session (frontend_architecture.md §4.1). Signed in it is
// ThisWeekPage; signed out it is the landing page, or in the demo the perspective
// chooser. Each is its own chunk: the landing page carries its own stylesheet and
// typeface, and the demo's chunk is one the normal app never downloads.
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
  const SignedOut = isDemo ? DemoEntryPage : LandingPage;
  return (
    <Suspense fallback={<AppBootSplash />}>
      <SignedOut />
    </Suspense>
  );
}
