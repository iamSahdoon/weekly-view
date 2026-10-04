import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { cn } from "../../lib/cn.js";
import { Button } from "./Button.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";
import { Select } from "./Select.jsx";

// Design §6.21. `--card`, 1px --hair bottom, 56px high, controls at `sm` (30px)
// with 11px gaps. Order: search → primary entity filter → secondary filters →
// date or week range → (spacer) → active-filter count and `Clear`. All filter
// state is the caller's, from the URL; this component holds none of it.
//
// Below 900px: search + one `Filters` button with a count, opening a sheet with
// the same controls stacked. Below 768px the table is stacked cards, so a single
// `Sort` Select (the `sort` prop) takes the place of the sortable headers.
//
//   search / onSearch   the URL's `q` and a setter; typing is debounced 250ms
//   sort                { options: [{ value: columnId, label }], value: { id, dir }, onChange }

const DEBOUNCE_MS = 250;

export function FilterBar({
  children,
  search,
  onSearch,
  searchPlaceholder = "Search",
  activeCount = 0,
  onClear,
  sort,
  width = "wide",
  className,
}) {
  const collapsed = useMediaQuery("(max-width: 899px)");
  const stacked = useMediaQuery("(max-width: 767px)");
  const [sheetOpen, setSheetOpen] = useState(false);

  const sortControl = sort && stacked ? <SortSelect sort={sort} /> : null;
  const clear = activeCount > 0 && onClear && (
    <Button variant="ghost" size="sm" onClick={onClear}>
      Clear ({activeCount})
    </Button>
  );

  return (
    <div className={cn("border-b border-hair bg-card", className)}>
      <div
        className={cn(
          "mx-auto flex min-h-[56px] w-full items-center gap-11 px-32 max-md:px-20",
          width === "wide"
            ? "max-w-[calc(var(--data-max)+64px)]"
            : "max-w-[calc(var(--page-max)+64px)]",
        )}
      >
        {onSearch && (
          <SearchField
            value={search ?? ""}
            onSearch={onSearch}
            placeholder={searchPlaceholder}
            className={collapsed ? "min-w-0 flex-1" : "w-[240px]"}
          />
        )}
        {collapsed ? (
          <>
            {(children || sortControl) && (
              <Button
                variant="secondary"
                size="sm"
                className={cn(
                  "touch-target shrink-0",
                  activeCount > 0 && "border-acc text-ink",
                )}
                onClick={() => setSheetOpen(true)}
              >
                <SlidersHorizontal aria-hidden="true" />
                {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
              </Button>
            )}
            <Modal
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              size="sm"
              title="Filters"
              footer={
                <>
                  {clear}
                  <Button onClick={() => setSheetOpen(false)}>Done</Button>
                </>
              }
            >
              <div className="flex flex-col gap-14 [&>*]:w-full">
                {sortControl}
                {children}
              </div>
            </Modal>
          </>
        ) : (
          <>
            {children}
            <div className="ml-auto flex items-center gap-11">{clear}</div>
          </>
        )}
      </div>
    </div>
  );
}

function SearchField({ value, onSearch, placeholder, className }) {
  const [text, setText] = useState(value);
  const timer = useRef(null);
  const lastSent = useRef(value);

  // The URL changed from outside (back button, Clear): follow it.
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (event) => {
    const next = event.target.value;
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastSent.current = next.trim();
      onSearch(next);
    }, DEBOUNCE_MS);
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-11 size-[14px] -translate-y-1/2 text-mut"
      />
      <Input
        type="search"
        value={text}
        onChange={change}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-[var(--ctrl-h-sm)] pl-32"
      />
    </div>
  );
}

function SortSelect({ sort }) {
  const options = sort.options.flatMap((option) => [
    { value: `${option.value}:asc`, label: `${option.label}, ascending` },
    { value: `${option.value}:desc`, label: `${option.label}, descending` },
  ]);
  return (
    <Select
      aria-label="Sort"
      value={`${sort.value.id}:${sort.value.dir}`}
      options={options}
      onChange={(event) => {
        const [id, dir] = event.target.value.split(":");
        sort.onChange({ id, dir });
      }}
    />
  );
}
