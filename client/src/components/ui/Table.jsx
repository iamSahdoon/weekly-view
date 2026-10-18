import { ChevronDown, ChevronUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { cn } from "../../lib/cn.js";
import { Skeleton } from "./Skeleton.jsx";

// Design §5. One table serves every list; differences are props.
//
//   columns  [{ id, header, cell(row), align: "left"|"right", width?, sortable?,
//               defaultDir?, mono?, mobile?: "primary"|"status"|"pair"|"hidden", label? }]
//   sort     { id, dir } — from the URL; onSortChange({ id, dir }) when a header is clicked
//   linkState  router state passed along when a row is opened (the review desk
//            hands its filters to the review page this way)
//   dense    36px rows for read-only report tables
//   tour     a `data-tour` name for the guided demo tour (an inert attribute)
//   emptyState / keepHeader  what stands in for the rows of an empty list; with
//            `keepHeader` the header row stays above it (a filtered-out list, design
//            §3.3), without it the state replaces the table (a list that is new)
//
// Below 768px it renders stacked cards instead of a <table> — one or the other,
// never both in the DOM (frontend_architecture.md §7.4). The whole row is the
// click target through a row handler plus a real <a> around the primary cell, so
// middle-click and ⌘-click work.

const INTERACTIVE = "a, button, input, select, textarea, label, [role=button]";

export function Table({
  columns,
  rows,
  rowKey = "_id",
  getRowHref,
  onRowClick,
  linkState,
  sort,
  onSortChange,
  dense = false,
  isLoading = false,
  skeletonRows = 8,
  isFetching = false,
  emptyState,
  keepHeader = false,
  caption,
  className,
  tour,
}) {
  const isStacked = useMediaQuery("(max-width: 767px)");
  const keyOf = typeof rowKey === "function" ? rowKey : (row) => row[rowKey];
  const hasRows = rows.length > 0;

  const headerClick = (column) => {
    if (!onSortChange) return;
    const dir =
      sort?.id === column.id
        ? sort.dir === "asc"
          ? "desc"
          : "asc"
        : (column.defaultDir ?? "asc");
    onSortChange({ id: column.id, dir });
  };

  if (!isLoading && !hasRows && emptyState && !(keepHeader && !isStacked)) {
    return (
      <div
        data-tour={tour}
        className={cn("border border-hair bg-card", className)}
      >
        {emptyState}
      </div>
    );
  }

  const shared = {
    columns,
    keyOf,
    getRowHref,
    onRowClick,
    linkState,
    dense,
  };

  return (
    <div
      data-tour={tour}
      aria-busy={isLoading || isFetching || undefined}
      className={cn(
        "transition-opacity duration-[120ms] ease-linear",
        isFetching && !isLoading && "opacity-60",
        className,
      )}
    >
      {isStacked ? (
        <StackedRows
          {...shared}
          rows={isLoading ? [] : rows}
          loadingRows={isLoading ? skeletonRows : 0}
        />
      ) : (
        <div className="overflow-x-auto border border-hair bg-card">
          <table className="w-full border-collapse text-left text-dense text-body">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead>
              <tr className="h-[var(--head-h)] border-b border-hair2 bg-tint">
                {columns.map((column) => (
                  <HeaderCell
                    key={column.id}
                    column={column}
                    sort={sort}
                    onClick={() => headerClick(column)}
                    sortable={Boolean(column.sortable && onSortChange)}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: skeletonRows }, (_, i) => (
                  <SkeletonRow
                    key={i}
                    columns={columns}
                    index={i}
                    dense={dense}
                  />
                ))
              ) : !hasRows && emptyState ? (
                <tr>
                  <td colSpan={columns.length}>{emptyState}</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <BodyRow key={keyOf(row)} row={row} {...shared} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HeaderCell({ column, sort, onClick, sortable }) {
  const active = sort?.id === column.id;
  const right = column.align === "right";
  const label = column.header;
  return (
    <th
      scope="col"
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
      }
      style={column.width ? { width: column.width } : undefined}
      className={cn(
        "px-16 text-micro font-medium text-mut first:pl-20 last:pr-20",
        right ? "text-right" : "text-left",
        active && "text-ink",
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "focus-inset group inline-flex h-[var(--head-h)] w-full items-center gap-6 font-medium",
            right && "justify-end",
            "hover:text-ink",
          )}
        >
          {label}
          <SortGlyph active={active} dir={sort?.dir} />
        </button>
      ) : (
        label
      )}
    </th>
  );
}

// §5.3: hidden at rest, --hair2 on header hover, --ink when the active sort.
function SortGlyph({ active, dir }) {
  const Icon = active && dir === "desc" ? ChevronDown : ChevronUp;
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "size-[10px] shrink-0",
        active ? "text-ink" : "text-transparent group-hover:text-hair2",
      )}
      strokeWidth={2.5}
    />
  );
}

function cellClass(column, isPrimary) {
  return cn(
    "px-16 align-middle first:pl-20 last:pr-20",
    column.align === "right" && "text-right tabular-nums",
    column.mono && "font-mono text-caption text-mut",
    isPrimary && "font-medium text-ink",
  );
}

function BodyRow({ row, columns, getRowHref, onRowClick, linkState, dense }) {
  const navigate = useNavigate();
  const href = getRowHref?.(row);
  const clickable = Boolean(href || onRowClick);

  const activate = (event) => {
    if (event.target.closest(INTERACTIVE)) return;
    if (href) navigate(href, { state: linkState });
    else onRowClick?.(row);
  };

  return (
    <tr
      onClick={clickable ? activate : undefined}
      onKeyDown={
        onRowClick && !href
          ? (event) => {
              if (event.key === "Enter" && event.target === event.currentTarget)
                onRowClick(row);
            }
          : undefined
      }
      tabIndex={onRowClick && !href ? 0 : undefined}
      className={cn(
        "border-b border-hair last:border-b-0",
        dense ? "h-[var(--row-h-dense)]" : "h-[var(--row-h)]",
        clickable &&
          "cursor-pointer transition-colors duration-[120ms] ease-linear hover:bg-tint active:bg-tint2",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acc has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-acc",
      )}
    >
      {columns.map((column, index) => (
        <td key={column.id} className={cellClass(column, index === 0)}>
          {index === 0 && href ? (
            <Link
              to={href}
              state={linkState}
              className="text-ink no-underline focus-visible:outline-none"
            >
              {column.cell(row)}
            </Link>
          ) : (
            column.cell(row)
          )}
        </td>
      ))}
    </tr>
  );
}

// Skeleton rows match the real row height and column widths so arriving content
// causes no reflow (design §6.16).
const SKELETON_WIDTHS = ["72%", "58%", "84%", "46%", "66%"];

function SkeletonRow({ columns, index, dense }) {
  return (
    <tr
      className={cn(
        "border-b border-hair last:border-b-0",
        dense ? "h-[var(--row-h-dense)]" : "h-[var(--row-h)]",
      )}
    >
      {columns.map((column, c) => (
        <td key={column.id} className={cellClass(column, false)}>
          <Skeleton
            className={cn("h-[14px]", column.align === "right" && "ml-auto")}
            style={{
              width: SKELETON_WIDTHS[(index + c) % SKELETON_WIDTHS.length],
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// §5.6: line 1 is the primary identifier and the status chip; line 2 is two or
// three `label value` pairs. The whole card is the click target.
function StackedRows({
  columns,
  rows,
  keyOf,
  getRowHref,
  onRowClick,
  linkState,
  loadingRows,
}) {
  const navigate = useNavigate();
  const modeOf = (column, index) =>
    column.mobile ?? (index === 0 ? "primary" : "pair");
  const primary =
    columns.find((c, i) => modeOf(c, i) === "primary") ?? columns[0];
  const status = columns.find((c, i) => modeOf(c, i) === "status");
  const pairs = columns.filter((c, i) => modeOf(c, i) === "pair");

  if (loadingRows) {
    return (
      <ul className="flex flex-col gap-8">
        {Array.from({ length: loadingRows }, (_, i) => (
          <li key={i} className="border border-hair bg-card p-14">
            <Skeleton className="h-[16px] w-[55%]" />
            <Skeleton className="mt-11 h-[12px] w-[80%]" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-8">
      {rows.map((row) => {
        const href = getRowHref?.(row);
        const clickable = Boolean(href || onRowClick);
        return (
          <li
            key={keyOf(row)}
            onClick={
              clickable
                ? (event) => {
                    if (event.target.closest(INTERACTIVE)) return;
                    if (href) navigate(href, { state: linkState });
                    else onRowClick?.(row);
                  }
                : undefined
            }
            className={cn(
              "flex flex-col gap-11 border border-hair bg-card p-14",
              clickable && "cursor-pointer active:bg-tint2",
              "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-acc",
            )}
          >
            <div className="flex items-center justify-between gap-11">
              <span className="min-w-0 truncate text-dense font-medium text-ink">
                {href ? (
                  <Link
                    to={href}
                    state={linkState}
                    className="text-ink no-underline focus-visible:outline-none"
                  >
                    {primary.cell(row)}
                  </Link>
                ) : (
                  primary.cell(row)
                )}
              </span>
              {status && <span className="shrink-0">{status.cell(row)}</span>}
            </div>
            {pairs.length > 0 && (
              <dl className="flex flex-wrap gap-x-20 gap-y-6">
                {pairs.map((column) => (
                  <div key={column.id} className="flex items-baseline gap-6">
                    <dt className="text-micro text-mut">
                      {column.label ?? column.header}
                    </dt>
                    <dd
                      className={cn(
                        "text-dense text-body",
                        column.mono && "font-mono text-caption text-mut",
                        column.align === "right" && "tabular-nums",
                      )}
                    >
                      {column.cell(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
