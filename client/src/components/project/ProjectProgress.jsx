// Project progress (design §6.25): a 4px --tint2 track with an --acc fill for the share
// used — days used ÷ planned days, or hours logged ÷ planned hours (no bar when no hours
// were planned). Past 100% the track fills and an overrun segment in --st-corr-bd
// extends it, capped at 150%, with the words beside it. The width never animates on
// mount (§6.22).

export function ProjectProgress({ progress, unit = "days" }) {
  const plan = progress?.plan;
  if (!plan) return null;
  const [used, planned] =
    unit === "hours"
      ? [progress.hoursLogged, plan.plannedHours]
      : [progress.daysUsed, plan.plannedDays];
  if (!planned) return null;

  const ratio = used / planned;
  const shown = Math.min(ratio, 1.5);
  // Over 100%, the whole width stands for `shown`; the track is the planned part.
  const track = ratio > 1 ? 100 / shown : 100;
  const fill = ratio > 1 ? 100 : Math.max(0, ratio * 100);

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={planned}
      aria-valuenow={used}
      aria-label={
        unit === "hours" ? "Hours logged of planned" : "Days used of planned"
      }
      className="flex h-[4px] w-full"
    >
      <div className="h-full bg-tint2" style={{ width: `${track}%` }}>
        <div className="h-full bg-acc" style={{ width: `${fill}%` }} />
      </div>
      {ratio > 1 && <div className="h-full flex-1 bg-st-corr-bd" />}
    </div>
  );
}
