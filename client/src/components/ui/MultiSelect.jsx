import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "./Button.jsx";
import { Checkbox } from "./Checkbox.jsx";
import { Input } from "./Input.jsx";
import { Popover } from "./Popover.jsx";

// Design §6.21: the multi-select filter. The trigger is a Secondary `sm` button
// showing `Label` when unset and `Label: value` (or `Label: 3`) in --ink with a
// 1px --acc border when set. The popover holds a checkbox list, a search field
// above it when there are more than 8 options, and Apply / Clear in a --tint
// footer. Choices are drafted in the popover and committed by Apply; Clear
// commits an empty selection and closes.

const SEARCH_ABOVE = 8;

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState("");
  const legendId = useId();

  const set = value.length > 0;
  const summary = useMemo(() => {
    if (!set) return label;
    if (value.length === 1) {
      const only = options.find((o) => o.value === value[0]);
      return `${label}: ${only?.label ?? value[0]}`;
    }
    return `${label}: ${value.length}`;
  }, [set, label, value, options]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? options.filter((o) => o.label.toLowerCase().includes(needle))
      : options;
  }, [options, query]);

  const handleOpen = (next) => {
    if (next) {
      setDraft(value);
      setQuery("");
    }
    setOpen(next);
  };

  const toggle = (optionValue) =>
    setDraft((current) =>
      current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue],
    );

  // ↑ ↓ move between the checkboxes; Tab still works.
  const arrows = (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const boxes = [
      ...event.currentTarget.querySelectorAll('input[type="checkbox"]'),
    ];
    const at = boxes.indexOf(document.activeElement);
    if (at === -1) return;
    event.preventDefault();
    boxes[at + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
  };

  return (
    <Popover
      open={open}
      onOpenChange={handleOpen}
      trigger={
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          aria-haspopup="dialog"
          className={cn(
            "justify-between gap-8",
            set && "border-acc text-ink enabled:hover:border-acc",
            className,
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown aria-hidden="true" className="size-[10px]!" />
        </Button>
      }
      className="w-[260px]"
    >
      {options.length > SEARCH_ABOVE && (
        <div className="border-b border-hair p-8">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}`}
            aria-label={`Search ${label.toLowerCase()}`}
            className="h-[var(--ctrl-h-sm)]"
          />
        </div>
      )}
      <fieldset
        aria-labelledby={legendId}
        onKeyDown={arrows}
        className="max-h-[280px] overflow-y-auto py-4"
      >
        <legend id={legendId} className="sr-only">
          {label}
        </legend>
        {visible.length === 0 && (
          <p className="px-14 py-8 text-dense text-mut">Nothing matches.</p>
        )}
        {visible.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={draft.includes(option.value)}
            onChange={() => toggle(option.value)}
            className="flex w-full px-14 py-6 hover:bg-tint"
          />
        ))}
      </fieldset>
      <div className="flex items-center justify-between gap-8 border-t border-hair bg-tint p-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange([]);
            setOpen(false);
          }}
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onChange(draft);
            setOpen(false);
          }}
        >
          Apply
        </Button>
      </div>
    </Popover>
  );
}
