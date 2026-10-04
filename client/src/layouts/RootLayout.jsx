import { Outlet } from "react-router-dom";
import { ReAuthModal } from "../components/shell/ReAuthModal.jsx";
import { Toaster } from "../components/ui/Toaster.jsx";

// The router's root (frontend_architecture.md §3.1): what needs both the router
// and auth. OfflineStrip joins in C2, the error boundary in C9.
export default function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
      <ReAuthModal />
    </>
  );
}
