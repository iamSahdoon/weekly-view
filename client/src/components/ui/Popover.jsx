import * as RadixPopover from "@radix-ui/react-popover";
import { cn } from "../../lib/cn.js";

// The shared Radix wrapper under WeekPicker, MultiSelect and the user menu
// (frontend_architecture.md §8.1; design §6.19): --card, 1px --hair2, the one
// --shadow-pop. Enter 120ms opacity + translateY(-2px→0); exit 100ms opacity.

export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
  contentProps,
}) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={8}
          className={cn(
            "wv-popover z-50 border border-hair2 bg-card shadow-[var(--shadow-pop)]",
            className,
          )}
          {...contentProps}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
