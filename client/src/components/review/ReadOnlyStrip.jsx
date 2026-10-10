// The `--tint` strip above a report on the review page (design §3.6): what the reader
// may and may not do here. For a report that is the reader's own it says why there is
// no action panel (§3.5, the self-review guard).

export function ReadOnlyStrip({ own = false }) {
  return (
    <div className="bg-tint px-20 py-11 text-dense text-body print:hidden">
      {own
        ? "You can’t review your own report."
        : "Read-only — you can comment, but you can’t edit."}
    </div>
  );
}
