import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel.jsx";
import { AuthIntroContext } from "../components/auth/authIntro.js";
import { BrandMark } from "../components/shell/BrandMark.jsx";

// The auth screens' frame (design §3.12; owner decisions, auth pages 2026-10-17, round
// three). From 1024px: two equal halves, the brand panel on the left and the form on the
// right, on every auth screen. Each half holds one 420px block centred in it, so the outer
// margins mirror. The two blocks are a matched pair on one grid: four shared rows (CSS
// subgrid) put "Back to home" level with the wordmark, the heading's row above both cards,
// the heading and panel rows beside the panel's line and sample card (the card at its
// natural height, its bottom level with the form panel's), and the form's links level with
// the caption. The rows above and below are at least 52px
// and share what height is left, so the pair sits on the screen's centre line; content
// taller than the screen makes the page scroll, never clip. The form stays first in the
// DOM (focus and reading order); below 1024px the panel collapses to a slim header and the
// form follows it, as one plain column.
//
// Round four (2026-10-17): the screen names a line for the panel (AuthIntroContext) that
// fills the space above the sample card, and the pair arrives with a short rise — the
// landing page's links are full page loads (they must not carry landing styles into the
// app), so this CSS entrance stands in for a view transition (design §8.5 entry 33).

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
  const [base, setBase] = useState(null);
  const [override, setOverride] = useState(null);
  // `override` travels too: a screen showing an expired link or a lost answer lays itself
  // out as a short screen (AuthScreen).
  const channel = useMemo(
    () => ({ setBase, setOverride, override }),
    [override],
  );
  return (
    <AuthIntroContext.Provider value={channel}>
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
            className="wv-auth-enter-late mx-auto flex w-full max-w-[420px] flex-col lg:row-span-4 lg:row-start-2 lg:grid lg:grid-rows-subgrid"
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
        <AuthBrandPanel
          intro={override ?? base}
          className="max-lg:hidden lg:col-start-1 lg:row-span-6 lg:row-start-1 lg:grid lg:grid-rows-subgrid lg:px-44"
        />
      </div>
    </AuthIntroContext.Provider>
  );
}
