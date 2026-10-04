import * as RadixTooltip from "@radix-ui/react-tooltip";

// Design §6.13: 350ms open delay, closes at once, no arrow, never interactive and
// never the only carrier of essential information. Dark-band surface (see Toaster).

export function Tooltip({ content, side = "top", children }) {
  if (!content) return children;
  return (
    <RadixTooltip.Provider delayDuration={350} skipDelayDuration={0}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={8}
            className="wv-tooltip z-50 max-w-[240px] bg-d-panel px-[10px] py-6 font-ui text-caption text-d-text shadow-[var(--shadow-pop)]"
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
