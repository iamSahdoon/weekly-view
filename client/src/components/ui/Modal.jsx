import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "./Button.jsx";

// Design §6.11. Focus is trapped and returns to the trigger (Radix). With
// `dismissible={false}` — a write in flight — Esc, the backdrop and the close
// button do nothing. Below 640px the modal is a full-screen sheet.

const WIDTHS = { sm: "sm:w-[420px]", md: "sm:w-[560px]", lg: "sm:w-[720px]" };

export function Modal({
  open,
  onOpenChange,
  size = "md",
  title,
  description,
  footer,
  dismissible = true,
  children,
}) {
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const body = useRef(null);
  // Focus the first interactive element of the body; the close button only when
  // the body has none (design §6.11).
  // Opened from state, not a Radix Trigger, so the opener is remembered here
  // and focus returns to it on close.
  const opener = useRef(null);
  const focusFirst = (event) => {
    opener.current = document.activeElement;
    const first = body.current?.querySelector(
      'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (first) {
      event.preventDefault();
      first.focus();
    }
  };
  const block = (event) => {
    if (!dismissible) event.preventDefault();
  };
  const trackEdges = (event) => {
    const el = event.currentTarget;
    setEdges({
      top: el.scrollTop > 0,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => (dismissible || next) && onOpenChange?.(next)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="wv-backdrop fixed inset-0 z-40 bg-[var(--backdrop)]" />
        <Dialog.Content
          onOpenAutoFocus={focusFirst}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus();
            }
          }}
          onEscapeKeyDown={block}
          onPointerDownOutside={block}
          onInteractOutside={block}
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "wv-modal fixed z-50 flex flex-col border border-hair2 bg-card shadow-[var(--shadow-pop)]",
            "inset-0 h-[100dvh] w-[100dvw]",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-w-[calc(100vw-40px)] sm:-translate-x-1/2 sm:-translate-y-1/2",
            WIDTHS[size],
          )}
        >
          <header className="flex h-[56px] shrink-0 items-center justify-between gap-11 px-24 sm:h-52">
            <Dialog.Title className="font-display text-panel font-bold text-ink">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                disabled={!dismissible}
                aria-label="Close"
              >
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>
          {description ? (
            <Dialog.Description className="sr-only">
              {description}
            </Dialog.Description>
          ) : null}
          <div
            ref={body}
            onScroll={trackEdges}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto border-y border-transparent p-24 sm:max-h-[min(70dvh,640px)]",
              edges.top && "border-t-hair",
              edges.bottom && "border-b-hair",
            )}
          >
            {children}
          </div>
          {footer && (
            <footer
              className={cn(
                "flex shrink-0 flex-col-reverse gap-11 border-t border-hair bg-tint p-24 [&>*]:w-full",
                "sm:h-62 sm:flex-row sm:items-center sm:justify-end sm:py-0 sm:[&>*]:w-auto",
              )}
            >
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
