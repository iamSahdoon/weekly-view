import { currentWeekKey, toCalendarDate, weekDays } from "./dates.js";

// Which day Team updates shows (design §3.16, frontend_architecture.md §9.2). A day
// can be chosen unless it is a holiday or still ahead — a future day would list
// everyone as "Not posted yet", which is noise. The default is today, or the latest
// day that can be chosen (Friday on a weekend, and in a past week).

/** The five days of a week with whether each can be chosen: [{ weekday, date, open, holiday? }]. */
export function updatesDays(weekKey, holidays = {}, now = new Date()) {
  const today = toCalendarDate(now);
  const isCurrent = weekKey === currentWeekKey(now);
  return weekDays(weekKey).map(({ weekday, date }) => {
    const holiday = holidays[weekday] ?? null;
    const future = isCurrent && toCalendarDate(date) > today;
    return { weekday, date, holiday, future, open: !holiday && !future };
  });
}

/** `raw` (the URL's `day`) if it can be chosen, else the default; null if no day can. */
export function resolveUpdatesDay(
  raw,
  weekKey,
  holidays = {},
  now = new Date(),
) {
  const days = updatesDays(weekKey, holidays, now);
  const chosen = days.find((d) => d.weekday === raw);
  if (chosen?.open) return chosen.weekday;
  const today = days.find(
    (d) => toCalendarDate(d.date) === toCalendarDate(now),
  );
  if (today?.open) return today.weekday;
  return days.findLast((d) => d.open)?.weekday ?? null;
}
