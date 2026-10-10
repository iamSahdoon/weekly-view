import { Outlet } from "react-router-dom";
import { BrandMark } from "../components/shell/BrandMark.jsx";

// The auth screens' frame (design §3.12): full-viewport --paper, a centred 420px
// column, the glyph and wordmark at the top. No shell, no marketing copy.
// Polish (2026-10-10): the column starts a fixed share of the viewport down (18vh,
// never under 52px), so it sits in the upper middle of the screen instead of hugging
// the top — and, unlike flex centring, it doesn't jump when a skeleton is swapped
// for a taller form.
export default function AuthLayout() {
  return (
    <main className="min-h-[100dvh] bg-paper px-16 pt-[max(52px,18vh)] pb-52 max-xs:pt-32">
      <div className="mx-auto w-full max-w-[420px]">
        <BrandMark className="mb-32 text-[20px]" />
        <Outlet />
      </div>
    </main>
  );
}
