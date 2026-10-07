// The one tooltip (design §7.3): the dark-band surface (--d-panel, which is the near-black
// --ink is in the light theme and stays dark in the dark one, so --d-text always reads),
// --d-text text, 10px 12px, --shadow-pop,
// no arrow. The header is the x value in mono 11px --d-mut; each row is an 8×8px swatch,
// a 12px --d-body label and a 13px --d-text value, tabular and right-aligned. Recharts
// hands it `active` and `payload`; the chart says what they mean through `describe`:
//
//   describe(payload, label) → { title, rows: [{ color, label, value }] }
//
// A tooltip with no rows renders nothing.

export function ChartTooltip({ active, payload, label, describe }) {
  if (!active || !payload?.length) return null;
  const { title, rows } = describe(payload, label);
  if (!rows.length) return null;
  return (
    <div className="border border-d-line bg-d-panel px-[12px] py-[10px] shadow-[var(--shadow-pop)]">
      {title && <p className="mb-6 font-mono text-micro text-d-mut">{title}</p>}
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-14">
            <span className="flex items-center gap-6 text-caption text-d-body">
              <span
                aria-hidden="true"
                className="size-[8px] shrink-0"
                style={{ background: row.color }}
              />
              {row.label}
            </span>
            <span className="ml-auto pl-14 text-[13px] text-d-text tabular-nums">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
