import { Navigate } from "react-router-dom";
import { AppBootSplash } from "../components/shell/AppBootSplash.jsx";
import { BrandMark } from "../components/shell/BrandMark.jsx";
import { Button } from "../components/ui/Button.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { ROLE_LABELS } from "../lib/constants.js";

// "/" branches on the session (frontend_architecture.md §4.1). Signed in it will be
// ThisWeekPage (C4); signed out, the landing page or the demo chooser (C10).
// Until those stages, a signed-in placeholder and a redirect to /signin stand in.
export default function IndexRoute() {
  const { status, user, isDemo, signOut } = useAuth();
  if (status === "loading") return <AppBootSplash />;
  if (!user) {
    return isDemo ? <StagePlaceholder /> : <Navigate to="/signin" replace />;
  }
  return (
    <StagePlaceholder>
      <p className="text-base text-body">
        Signed in as <span className="text-ink">{user.name}</span> ·{" "}
        {ROLE_LABELS[user.role]}
        {user.isOwner && " · owner"}
      </p>
      {!isDemo && (
        <Button variant="secondary" className="mt-20" onClick={signOut}>
          Sign out
        </Button>
      )}
    </StagePlaceholder>
  );
}

function StagePlaceholder({ children }) {
  return (
    <main className="min-h-[100dvh] bg-paper px-16 py-52">
      <div className="mx-auto max-w-[420px]">
        <BrandMark className="mb-32 text-[20px]" />
        {children}
      </div>
    </main>
  );
}
