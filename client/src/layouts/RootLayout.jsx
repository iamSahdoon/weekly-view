import { useEffect, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { ErrorBoundary } from "../components/shell/ErrorBoundary.jsx";
import { StandaloneError } from "../components/shell/ErrorStates.jsx";
import { LeaveGuard } from "../components/shell/LeaveGuard.jsx";
import { ReAuthModal } from "../components/shell/ReAuthModal.jsx";
import { SkipLink } from "../components/shell/SkipLink.jsx";
import { Toaster } from "../components/ui/Toaster.jsx";
import { useIsDemo } from "../hooks/useIsDemo.js";

// The demo's guided tour: an overlay over every page under /demo, in its own chunk, so
// the real app never downloads it (owner request, 2026-10-17; frontend_architecture §11.6).
// It draws nothing until it is asked for, so there is no loading state to show; a request
// made while it loads waits for it (demo/tour/tourBus.js).
function DemoTour() {
  const [Layer, setLayer] = useState(null);
  useEffect(() => {
    import("../demo/tour/TourLayer.jsx").then((module) =>
      setLayer(() => module.default),
    );
  }, []);
  return Layer ? <Layer /> : null;
}

// The router's root (frontend_architecture.md §3.1): what needs both the router
// and auth. The OfflineStrip is mounted by AppShell, under the top bar (design
// §3.13). The boundary here is the outer one: a signed-out page, or the shell itself,
// failing; a page inside the shell is caught by AppShell's own, so the shell survives.
// Under /demo it also mounts the tour layer, which must outlive a change of person.
export default function RootLayout() {
  const { pathname } = useLocation();
  const isDemo = useIsDemo();
  return (
    <>
      <SkipLink />
      <ErrorBoundary fallback={StandaloneError} resetKey={pathname}>
        <Outlet />
      </ErrorBoundary>
      <Toaster />
      <ReAuthModal />
      <LeaveGuard />
      <ScrollRestoration />
      {isDemo && <DemoTour />}
    </>
  );
}
