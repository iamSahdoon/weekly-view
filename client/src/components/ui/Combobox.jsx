import * as RadixPopover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { forwardRef, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn.js";
import { inputClasses } from "./inputClasses.js";

// The task picker's control (frontend_architecture.md §8.2): the ARIA combobox
// pattern on a Radix Popover anchor. Typing filters; ↑/↓ move the highlight, Enter
// picks it, Esc closes and restores the chosen label. Focus stays in the input — the
// list is referenced with aria-activedescendant, never focused.
//
//   value     the chosen option's value, or null
//   groups    [{ label, options: [{ value, label }] }] — empty groups are not drawn
//   action    { value, label } — a last option outside the groups ("Start a new task…")
//   onChange  (value) => void
//
// `id`, `aria-invalid` and `aria-describedby` (from Field) go on the input.

export const Combobox = forwardRef(function Combobox(
  {
    value,
    groups,
    action,
    onChange,
    onBlur,
    placeholder,
    emptyText = "Nothing matches.",
    disabled = false,
    className,
    ...inputProps
  },
  ref,
) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const all = groups.flatMap((g) => g.options);
  const selected =
    all.find((o) => o.value === value) ??
    (action && action.value === value ? action : null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        options: q
          ? g.options.filter((o) => o.label.toLowerCase().includes(q))
          : g.options,
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, query]);
  const flat = [
    ...visible.flatMap((g) => g.options),
    ...(action ? [action] : []),
  ];
  const optionId = (index) => `${listId}-${index}`;

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const openList = () => {
    if (disabled) return;
    setActive(
      Math.max(
        0,
        flat.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const pick = (option) => {
    onChange(option.value);
    close();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + flat.length) % Math.max(flat.length, 1));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (flat[active]) pick(flat[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab" && open) {
      close();
    }
  };

  let index = -1;
  return (
    <RadixPopover.Root open={open} onOpenChange={(next) => !next && close()}>
      <RadixPopover.Anchor asChild>
        <div className={cn("relative", className)}>
          <input
            ref={ref}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && flat[active] ? optionId(active) : undefined
            }
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={open ? query : (selected?.label ?? "")}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              if (!open) setOpen(true);
            }}
            onClick={() => (open ? close() : openList())}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            className={cn(
              inputClasses,
              "h-[var(--ctrl-h)] truncate pr-32 max-md:h-[var(--ctrl-h-lg)]",
            )}
            {...inputProps}
          />
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-[12px] size-[10px] -translate-y-1/2 text-mut"
            strokeWidth={2.5}
          />
        </div>
      </RadixPopover.Anchor>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          // A press on the input itself is the toggle, not an outside click.
          onInteractOutside={(event) => {
            if (
              event.target
                .closest?.("[role=combobox]")
                ?.getAttribute("aria-controls") === listId
            )
              event.preventDefault();
          }}
          className="wv-popover z-50 max-h-[320px] w-[max(var(--radix-popover-trigger-width),260px)] overflow-y-auto border border-hair2 bg-card py-4 shadow-[var(--shadow-pop)]"
        >
          <ul id={listId} role="listbox" aria-label={placeholder}>
            {visible.map((group) => (
              <li key={group.label} role="presentation">
                <div
                  role="group"
                  aria-label={group.label}
                  className="flex flex-col"
                >
                  <span
                    aria-hidden="true"
                    className="px-11 pt-8 pb-4 text-micro font-medium text-mut"
                  >
                    {group.label}
                  </span>
                  {group.options.map((option) => {
                    index += 1;
                    return (
                      <Option
                        key={option.value}
                        id={optionId(index)}
                        option={option}
                        active={index === active}
                        selected={option.value === value}
                        onPick={pick}
                        onHover={setActive.bind(null, index)}
                      />
                    );
                  })}
                </div>
              </li>
            ))}
            {visible.length === 0 && (
              <li
                role="presentation"
                className="px-11 py-8 text-dense text-mut"
              >
                {emptyText}
              </li>
            )}
            {action && (
              <li
                role="presentation"
                className="mt-4 border-t border-hair pt-4"
              >
                <Option
                  id={optionId(flat.length - 1)}
                  option={action}
                  active={active === flat.length - 1}
                  selected={action.value === value}
                  onPick={pick}
                  onHover={() => setActive(flat.length - 1)}
                />
              </li>
            )}
          </ul>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
});

function Option({ id, option, active, selected, onPick, onHover }) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      // Keep focus in the input: a mousedown would blur it before the click lands.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(option)}
      onMouseMove={onHover}
      className={cn(
        "flex min-h-[34px] cursor-pointer items-center px-11 text-dense text-ink max-md:min-h-[44px]",
        active && "bg-tint",
        selected && "font-medium text-acc-txt",
      )}
    >
      <span className="truncate">{option.label}</span>
    </div>
  );
}
