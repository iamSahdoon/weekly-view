import { ArrowLeft } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel.jsx";
import { BrandMark } from "../components/shell/BrandMark.jsx";

// The auth screens' frame (design §3.12; owner decisions, auth pages 2026-10-17, round
// three). From 1024px: two equal halves, the brand panel on the left and the form on the
// right, on every auth screen. Each half holds one 420px block centred in it, so the outer
// margins mirror. The two blocks are a matched pair on one grid: four shared rows (CSS
// subgrid) put "Back to home" level with the wordmark, the heading's row above both cards,
// the form's panel level with the sample card (the card stretches to the panel's height),
// and the form's links level with the caption. The rows above and below are at least 52px
// and share what height is left, so the pair sits on the screen's centre line; content
// taller than the screen makes the page scroll, never clip. The form stays first in the
// DOM (focus and reading order); below 1024px the panel collapses to a slim header and the
// form follows it, as one plain column.

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
    <div className="min-h-[100dvh] bg-paper lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(52px,1fr)_auto_auto_auto_auto_minmax(52px,1fr)]">
      <header className="flex h-[52px] items-center justify-between border-b border-hair bg-card px-16 lg:hidden">
        <BrandMark className="text-[17px]" glyphSize={18} />
        <BackHome />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="px-16 pt-32 pb-52 outline-none sm:px-44 sm:pt-52 lg:col-start-2 lg:row-span-6 lg:row-start-1 lg:grid lg:grid-rows-subgrid lg:px-44 lg:py-0"
      >
        <div
          data-auth-block="form"
          className="mx-auto flex w-full max-w-[420px] flex-col lg:row-span-4 lg:row-start-2 lg:grid lg:grid-rows-subgrid"
        >
          <div className="pb-24 max-lg:hidden">
            <BackHome />
          </div>
          {/* The screen's heading, panel and links fill the next three rows. */}
          <div className="contents">
            <Outlet />
          </div>
        </div>
      </main>
      <AuthBrandPanel className="max-lg:hidden lg:col-start-1 lg:row-span-6 lg:row-start-1 lg:grid lg:grid-rows-subgrid lg:px-44" />
    </div>
  );
}
