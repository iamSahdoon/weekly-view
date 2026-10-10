import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { ErrorBoundary } from "../components/shell/ErrorBoundary.jsx";
import { StandaloneError } from "../components/shell/ErrorStates.jsx";
import { LeaveGuard } from "../components/shell/LeaveGuard.jsx";
import { ReAuthModal } from "../components/shell/ReAuthModal.jsx";
import { SkipLink } from "../components/shell/SkipLink.jsx";
import { Toaster } from "../components/ui/Toaster.jsx";

// The router's root (frontend_architecture.md §3.1): what needs both the router
// and auth. The OfflineStrip is mounted by AppShell, under the top bar (design
// §3.13). The boundary here is the outer one: a signed-out page, or the shell itself,
// failing; a page inside the shell is caught by AppShell's own, so the shell survives.
export default function RootLayout() {
  const { pathname } = useLocation();
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
    </>
  );
}
