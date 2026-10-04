import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { WEEKDAYS } from "../lib/constants.js";
import {
  compareWeekKeys,
  currentWeekKey,
  isWeekKey,
  weekKeyOf,
  weekdayOf,
} from "../lib/dates.js";
import { useAuth } from "./useAuth.js";

// ?week= and ?day= (frontend_architecture.md §4.2). The current week comes from
// the browser's clock (api_specification.md I2).

/**
 * Missing → the current week. Malformed, before the person's joinedAt week, or
 * later than the current week → also the current week.
 */
export function useWeekParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const raw = searchParams.get("week");
  const joinedAt = user?.joinedAt ?? null;

  const current = currentWeekKey();
  const weekKey = useMemo(() => {
    if (!isWeekKey(raw)) return current;
    if (compareWeekKeys(raw, current) > 0) return current;
    if (joinedAt && compareWeekKeys(raw, weekKeyOf(new Date(joinedAt))) < 0)
      return current;
    return raw;
  }, [raw, current, joinedAt]);

  const setWeek = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams);
      if (next === currentWeekKey()) params.delete("week");
      else params.set("week", next);
      // A day belongs to the week it was chosen in.
      params.delete("day");
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  return { weekKey, isCurrent: weekKey === current, setWeek };
}

/**
 * ?day=. Default: today when `weekKey` is the current week (Monday on a
 * weekend), else the earliest missing day when the page passes `missingDays`,
 * else Monday.
 */
export function useWeekdayParam(weekKey, { missingDays } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("day");

  let weekday;
  if (WEEKDAYS.includes(raw)) {
    weekday = raw;
  } else if (weekKey === currentWeekKey()) {
    weekday = weekdayOf(new Date()) ?? "mon";
  } else {
    weekday = WEEKDAYS.find((day) => missingDays?.includes(day)) ?? "mon";
  }

  const setWeekday = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams);
      params.set("day", next);
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  return { weekday, setWeekday };
}
