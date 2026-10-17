import { ArrowLeft } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel.jsx";
import { BrandMark } from "../components/shell/BrandMark.jsx";

// The auth screens' frame (design §3.12; owner decisions, auth pages 2026-10-17). From
// 1024px a split, the form always on the left: the form side (--paper, 55%) centres one
// 420px column in its half — "Back to home", the heading, the panel and the links on one
// left edge — and the brand panel (45%) holds the wordmark, a sample week and one line.
// Below 1024px the panel collapses to a slim header (the wordmark and the way back) and the
// form comes first, from the top. Every auth route shares this frame; the demo has its own.

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
    <div className="min-h-[100dvh] bg-paper lg:grid lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      <header className="flex h-[52px] items-center justify-between border-b border-hair bg-card px-16 lg:hidden">
        <BrandMark className="text-[17px]" glyphSize={18} />
        <BackHome />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="px-16 pt-32 pb-52 outline-none sm:px-44 sm:pt-52 lg:flex lg:min-h-[100dvh] lg:items-center lg:justify-center lg:px-52 lg:py-52"
      >
        <div className="mx-auto w-full max-w-[420px] lg:mx-0">
          <div className="mb-24 max-lg:hidden">
            <BackHome />
          </div>
          <Outlet />
        </div>
      </main>
      <AuthBrandPanel className="max-lg:hidden" />
    </div>
  );
}
