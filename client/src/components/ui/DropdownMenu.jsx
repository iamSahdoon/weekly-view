import * as Menu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { Button } from "./Button.jsx";

// A row's action menu (design §3.10's "row menu"; Radix). `items` are
// { label, onSelect, disabled?, reason?, destructive?, separatorBefore? }. A disabled
// item stays in the list, muted, with its `reason` printed under it — the words are
// on the page, not behind a hover (design §6.13: a tooltip is never the only carrier).
// The surface is the shared popover look: --card, 1px --hair2, the one --shadow-pop.

const ITEM =
  "focus-inset flex w-full cursor-pointer flex-col items-start justify-center gap-2 px-14 py-6 text-left text-dense text-body outline-none " +
  "data-[highlighted]:bg-tint data-[highlighted]:text-ink data-[disabled]:cursor-not-allowed data-[disabled]:text-mut";

export function DropdownMenu({ label, items, align = "end", ...triggerProps }) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={label}
          className="touch-target"
          {...triggerProps}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align={align}
          sideOffset={4}
          collisionPadding={8}
          className="wv-popover z-50 max-w-[300px] min-w-[220px] border border-hair2 bg-card py-4 shadow-[var(--shadow-pop)]"
        >
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore && (
                <Menu.Separator className="my-4 h-px bg-hair" />
              )}
              <Menu.Item
                data-tour={item.tour}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(ITEM, item.destructive && "text-st-corr-fg")}
              >
                <span>{item.label}</span>
                {item.disabled && item.reason && (
                  <span className="text-micro font-normal text-mut">
                    {item.reason}
                  </span>
                )}
              </Menu.Item>
            </div>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
