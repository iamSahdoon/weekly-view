import { cn } from "../../lib/cn.js";

// A page names its width (design §3.0, frontend_architecture.md §7.3) rather than
// writing a number: doc 860, page 1240, wide 1560. The gutter is 32px (20px below
// 768px); 32px of top padding under the bar, 88px at the foot. The max widths add
// the gutters back so the content measure is what the name says.
//
// Polish (2026-10-10, owner decision): a container keeps to the left edge of the
// content column instead of centring. The top bar's title sits at that edge, so a
// narrow page (Holidays, Account) now lines up under its own title rather than
// floating in the middle of a wide screen.

const SIZES = {
  doc: "max-w-[calc(var(--doc-max)+64px)]",
  page: "max-w-[calc(var(--page-max)+64px)]",
  wide: "max-w-[calc(var(--data-max)+64px)]",
};

export function PageContainer({ size = "page", className, children }) {
  return (
    <div
      className={cn(
        "mr-auto w-full px-32 pt-32 pb-88 max-md:px-20 print:max-w-none print:p-0",
        SIZES[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
