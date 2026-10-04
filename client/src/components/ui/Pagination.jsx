import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_LIMITS } from "../../lib/constants.js";
import { Button } from "./Button.jsx";
import { Select } from "./Select.jsx";

// Design §5.5: below the table, outside its border, 20px above, 44px high.
//   Rows per page [ 20 ▾ ]            1–20 of 84         [ ‹ ] [ › ]
// No numbered pills, no infinite scroll. Page state lives in the URL; this only
// calls back. `Rows per page` is hidden below 768px.

export function Pagination({ meta, onPage, onLimit }) {
  const { page, limit, total, totalPages } = meta;
  if (!total) return null;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <nav
      aria-label="Pagination"
      className="mt-20 flex h-44 items-center justify-between gap-16"
    >
      <label className="flex items-center gap-8 text-dense text-mut max-md:hidden">
        Rows per page
        <Select
          className="w-[76px]"
          value={limit}
          onChange={(event) => onLimit(Number(event.target.value))}
          options={PAGE_LIMITS.map((n) => ({ value: n, label: String(n) }))}
        />
      </label>
      <div className="flex items-center gap-16 max-md:w-full max-md:justify-between">
        <p
          aria-live="polite"
          className="font-mono text-caption text-mut tabular-nums"
        >
          {first}–{last} of {total}
        </p>
        <div className="flex gap-8">
          <Button
            variant="secondary"
            iconOnly
            className="touch-target h-32 w-32"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            iconOnly
            className="touch-target h-32 w-32"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}
