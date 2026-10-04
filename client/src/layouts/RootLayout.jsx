import { Outlet, ScrollRestoration } from "react-router-dom";
import { ReAuthModal } from "../components/shell/ReAuthModal.jsx";
import { SkipLink } from "../components/shell/SkipLink.jsx";
import { Toaster } from "../components/ui/Toaster.jsx";

// The router's root (frontend_architecture.md §3.1): what needs both the router
// and auth. The OfflineStrip is mounted by AppShell, under the top bar (design
// §3.13); the error boundary arrives in C9.
export default function RootLayout() {
  return (
    <>
      <SkipLink />
      <Outlet />
      <Toaster />
      <ReAuthModal />
      <ScrollRestoration />
    </>
  );
}
