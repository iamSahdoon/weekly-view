import { useQueries, useQuery } from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import { toCalendarDate, weekDays } from "../lib/dates.js";
import * as holidayService from "../services/holidayService.js";

// Holiday hooks (frontend_architecture.md §5.6). The writes arrive with the holidays
// page (C8).

const yearOptions = (year) => ({
  queryKey: qk.holidays(year),
  queryFn: () =>
    holidayService.listHolidays({ from: `${year}-01-01`, to: `${year}-12-31` }),
});

/** HD1 for one calendar year. */
export function useHolidays(year) {
  return useQuery(yearOptions(year));
}

/**
 * The holidays inside one week (§5.6): the year of its Monday and, if different, of
 * its Friday — week 1 can start in December — filtered to the week. `dayStates` says
 * `holiday`; this says which one. `data` is `{ [weekday]: holiday }`.
 */
export function useHolidaysForWeek(weekKey) {
  const days = weekDays(weekKey);
  const years = [
    ...new Set([days[0].date.getFullYear(), days[4].date.getFullYear()]),
  ];
  return useQueries({
    queries: years.map(yearOptions),
    combine: (results) => {
      const failed = results.find((r) => r.isError);
      const isPending = results.some((r) => r.isPending);
      if (isPending || failed) {
        return { isPending, isError: Boolean(failed), data: undefined };
      }
      const items = results.flatMap((r) => r.data.items);
      const byDate = new Map(items.map((h) => [h.date.slice(0, 10), h]));
      const data = {};
      for (const { weekday, date } of days) {
        const key = toCalendarDate(date);
        if (byDate.has(key)) data[weekday] = byDate.get(key);
      }
      return { isPending: false, isError: false, data };
    },
  });
}
