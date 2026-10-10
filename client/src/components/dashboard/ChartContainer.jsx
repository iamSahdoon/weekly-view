import { cn } from "../../lib/cn.js";
import { InlineError } from "../ui/InlineError.jsx";
import { QueryView } from "../ui/QueryView.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { SampleDataPill } from "../ui/SampleDataPill.jsx";

// A chart's panel (design §7.2, frontend_architecture.md §10): a 44px-or-taller header with a
// 1px --hair bottom — the title (Chivo 700, 15px) on the left, with an optional one-line
// `subtitle` in --mut under it (what the chart counts), a scope control or the legend
// on the right — and a plot with 20px 24px 16px padding. The plot's height is fixed by
// the caller (260 trend, 240 bars), so a row never jumps as data arrives. The legend is
// built from the series list, never the library's; a single series has none.
//
// `ChartBlock` is a container plus its own `QueryView`: skeleton at the real height, an
// inline error with `Try again` that leaves the title and scope control live, and the
// plot. When `empty(data)` returns text the axes still render and the text sits centred
// over them. `summary(data)` is the chart's data as a short table, visually hidden, for
// people who can't see the plot (FA15).

export function ChartContainer({
  title,
  subtitle,
  legend,
  scope,
  className,
  children,
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex min-w-0 flex-col border border-hair bg-card",
        className,
      )}
    >
      <header className="flex min-h-[44px] flex-wrap items-center justify-between gap-x-14 gap-y-6 border-b border-hair px-24 py-6">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-8">
            <h2 className="font-display text-panel-sm font-bold text-ink">
              {title}
            </h2>
            <SampleDataPill />
          </div>
          {subtitle && <p className="text-caption text-mut">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-x-14 gap-y-6">
          {legend && <Legend items={legend} />}
          {scope}
        </div>
      </header>
      <div className="px-24 pt-20 pb-16">{children}</div>
    </section>
  );
}

export function ChartBlock({
  query,
  title,
  subtitle,
  legend,
  scope,
  height,
  empty,
  summary,
  className,
  children,
}) {
  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      legend={legend}
      scope={scope}
      className={className}
    >
      <QueryView
        query={query}
        skeleton={<Skeleton className="w-full" style={{ height }} />}
        error={
          <div style={{ height }}>
            <InlineError
              title="This chart didn’t load."
              onRetry={() => query.refetch()}
              className="h-full"
            >
              Check your connection and try again.
            </InlineError>
          </div>
        }
      >
        {(data) => {
          const emptyText = empty?.(data);
          return (
            <>
              <div className="relative" style={{ height }}>
                {children(data)}
                {emptyText && (
                  <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-mut">
                    {emptyText}
                  </p>
                )}
              </div>
              {summary && <ChartSummary {...summary(data)} />}
            </>
          );
        }}
      </QueryView>
    </ChartContainer>
  );
}

function Legend({ items }) {
  return (
    <ul
      aria-label="Legend"
      className="flex flex-wrap items-center gap-x-14 gap-y-4"
    >
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-6 text-micro text-mut"
        >
          <span
            aria-hidden="true"
            className="size-[8px]"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// The wrapper clips: `sr-only` on a <table> itself doesn't, because a table lays out at
// the width of its content, and a wide one would scroll the page sideways on a phone.
export function ChartSummary({ caption, head, rows }) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
