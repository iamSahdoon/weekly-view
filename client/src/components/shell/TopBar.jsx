import * as Dialog from "@radix-ui/react-dialog";
import { Ellipsis, Menu } from "lucide-react";
import { useState } from "react";
import { usePageChrome } from "../../context/PageChromeContext.jsx";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { Button } from "../ui/Button.jsx";
import { Popover } from "../ui/Popover.jsx";

// Design §1.5: a 62px bar, sticky within the content column. A two-line left
// block (back-link or breadcrumb, then the title), then week picker → secondary
// → primary, an 11px gap apart. It renders the slots; a page's <PageHeader/>
// fills them (frontend_architecture.md §7.3).
//
// Below 1024px the sidebar is a drawer and its hamburger is the first control;
// secondary actions move into a `⋯` menu. Below 640px the week picker drops to
// its own row under the title.

export function TopBar({ showMenu }) {
  const { slotRefs, hasSecondary } = usePageChrome();
  const narrow = useMediaQuery("(max-width: 1023px)");
  const [overflow, setOverflow] = useState(false);
  const inMenu = narrow && hasSecondary;

  return (
    <header className="sticky top-[var(--demo-h,0px)] z-30 flex flex-wrap items-center gap-x-11 border-b border-hair bg-card px-32 max-md:px-20">
      {showMenu && (
        <Dialog.Trigger asChild>
          <Button
            variant="ghost"
            iconOnly
            aria-label="Open navigation"
            className="touch-target -ml-8 shrink-0"
          >
            <Menu />
          </Button>
        </Dialog.Trigger>
      )}
      <div className="flex h-[61px] min-w-0 flex-1 flex-col justify-center">
        <div
          ref={slotRefs.back}
          className="min-w-0 text-caption text-mut empty:hidden"
        />
        <div ref={slotRefs.title} className="min-w-0" />
      </div>
      <div
        ref={slotRefs.weekPicker}
        className="flex items-center empty:hidden max-sm:order-last max-sm:w-full max-sm:pb-11"
      />
      {inMenu ? (
        <Popover
          open={overflow}
          onOpenChange={setOverflow}
          align="end"
          trigger={
            <Button
              variant="secondary"
              iconOnly
              aria-label="More actions"
              className="touch-target"
            >
              <Ellipsis />
            </Button>
          }
        >
          <div
            ref={slotRefs.secondary}
            className="flex min-w-[180px] flex-col gap-8 p-8 [&>*]:w-full"
            onClick={() => setOverflow(false)}
          />
        </Popover>
      ) : (
        <div
          ref={slotRefs.secondary}
          className="flex items-center gap-11 empty:hidden"
        />
      )}
      <div
        ref={slotRefs.primary}
        className="flex items-center gap-11 empty:hidden"
      />
    </header>
  );
}
