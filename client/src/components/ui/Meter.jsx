// Design §6.22: a 4px --tint2 track with an --acc fill, zero radius. The width
// transitions 200 ms and only on a change the person caused — it is the same element
// from the first paint, so nothing animates on mount. `value` is 0–1.

export function Meter({ value, label }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={clamped}
      className="h-[4px] w-full bg-tint2"
    >
      <div
        className="h-full bg-acc transition-[width] duration-[200ms] ease-linear"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
