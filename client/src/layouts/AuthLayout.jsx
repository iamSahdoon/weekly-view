import { Outlet } from "react-router-dom";
import { BrandMark } from "../components/shell/BrandMark.jsx";

// The auth screens' frame (design §3.12): full-viewport --paper, a centred 420px
// column, the glyph and wordmark at the top. No shell, no marketing copy.
export default function AuthLayout() {
  return (
    <main className="min-h-[100dvh] bg-paper px-16 py-52 max-xs:py-32">
      <div className="mx-auto w-full max-w-[420px]">
        <BrandMark className="mb-32 text-[20px]" />
        <Outlet />
      </div>
    </main>
  );
}
