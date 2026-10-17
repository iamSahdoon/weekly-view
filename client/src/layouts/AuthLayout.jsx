import { ArrowLeft } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel.jsx";
import { BrandMark } from "../components/shell/BrandMark.jsx";

// The auth screens' frame (design §3.12; owner decision, auth pages 2026-10-17): a calm
// split. The form side (--paper) holds a way back to the start page, the heading and the
// form in a 420px column; the brand panel (--card, a hairline between) holds the wordmark,
// one line and the week of squares. Below 1024px the panel collapses to a slim header —
// the wordmark and the way back — and the form comes first. The column starts a fixed
// share of the viewport down rather than being centred, so it doesn't jump when a
// skeleton gives way to a taller form (polish, 2026-10-10). Not used by the demo: these
// routes are real-only, and the demo's chooser has its own frame.

function BackHome() {
  return (
    <Link
      to="/"
      className="focus-halo -mx-4 inline-flex min-h-[32px] items-center gap-6 px-4 text-dense text-mut transition-colors duration-[120ms] ease-linear hover:text-ink"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      Back to home
    </Link>
  );
}

export default function AuthLayout() {
  return (
    <div className="min-h-[100dvh] bg-paper lg:grid lg:grid-cols-2">
      <header className="flex h-[52px] items-center justify-between border-b border-hair bg-card px-16 lg:hidden">
        <BrandMark className="text-[17px]" glyphSize={18} />
        <BackHome />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="px-16 pb-52 outline-none sm:px-44"
      >
        <div className="mx-auto w-full max-w-[420px]">
          <div className="pt-32 max-lg:hidden">
            <BackHome />
          </div>
          <div className="pt-32 sm:pt-[max(52px,10vh)] lg:pt-[max(52px,14vh)]">
            <Outlet />
          </div>
        </div>
      </main>
      <AuthBrandPanel className="max-lg:hidden" />
    </div>
  );
}
