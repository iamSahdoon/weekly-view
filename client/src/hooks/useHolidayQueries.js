import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import { parseCalendarDate, toCalendarDate, weekDays } from "../lib/dates.js";
import * as holidayService from "../services/holidayService.js";

// Holiday hooks (frontend_architecture.md §5.6, §5.7).

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
 * The holidays a plan may cross, as a Set of YYYY-MM-DD: the start year and as many
 * after it as `plannedDays` can reach (about 250 working days a year). `data` is
 * undefined until every year has loaded. PlanModal's finish line reads it.
 */
export function useHolidaySet(startDate, plannedDays) {
  const start = startDate ? parseCalendarDate(startDate) : null;
  const first = start ? start.getFullYear() : new Date().getFullYear();
  const span = Math.min(5, Math.floor((Number(plannedDays) || 0) / 200) + 1);
  const years = Array.from({ length: span + 1 }, (_, i) => first + i);
  return useQueries({
    queries: years.map(yearOptions),
    combine: (results) =>
      results.some((r) => r.isPending || r.isError)
        ? { isPending: true, data: undefined }
        : {
            isPending: false,
            data: new Set(
              results.flatMap((r) =>
                r.data.items.map((h) => h.date.slice(0, 10)),
              ),
            ),
          },
  });
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

// A holiday moves every derived thing: the calendar, project plans (a holiday is not a
// working day), the weeks' day states, the team's day and the dashboard.
function useHolidayWrite(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of [
        qk.all.holidays(),
        qk.all.projects(),
        qk.all.week(),
        qk.all.teamUpdates(),
        qk.all.dashboard(),
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** HD2. */
export const useCreateHoliday = () =>
  useHolidayWrite((body) => holidayService.createHoliday(body));

/** HD3 — `{ id, body }`. */
export const useUpdateHoliday = () =>
  useHolidayWrite(({ id, body }) => holidayService.updateHoliday(id, body));

/** HD4 — the holiday id. */
export const useDeleteHoliday = () =>
  useHolidayWrite((id) => holidayService.deleteHoliday(id));
