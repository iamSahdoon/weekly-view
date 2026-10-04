import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { parseParams, toApiParams } from "../lib/urlParams.js";

// Filters, sort, page and limit live in the URL (design §11 rule 11;
// frontend_architecture.md §4.2). `spec` is a record of lib/urlParams
// descriptors — define it at module level so it stays one identity.
//
// Defaults are never written; an invalid value reads as the default; any change
// to a filter, sort, direction or limit resets `page`. Discrete choices push a
// history entry; pass { replace: true } for search typing. Params outside the
// spec (`week`, `day`) are left as they are.

const NOT_A_FILTER = new Set(["page", "sort", "dir", "limit"]);

export function useUrlFilters(spec) {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.toString();

  const filters = useMemo(
    () => parseParams(spec, new URLSearchParams(search)),
    [spec, search],
  );

  const apiParams = useMemo(() => toApiParams(spec, filters), [spec, filters]);

  const activeCount = useMemo(
    () =>
      Object.keys(spec).filter(
        (key) => !NOT_A_FILTER.has(key) && !spec[key].isDefault(filters[key]),
      ).length,
    [spec, filters],
  );

  const setFilters = useCallback(
    (patch, { replace = false } = {}) => {
      const next = new URLSearchParams(search);
      const write = (key, value) => {
        const serialized = spec[key].serialize(value);
        if (serialized == null) next.delete(key);
        else next.set(key, serialized);
      };
      for (const [key, value] of Object.entries(patch)) {
        if (spec[key]) write(key, value);
      }
      if (spec.page && !("page" in patch)) next.delete("page");
      setSearchParams(next, { replace });
    },
    [spec, search, setSearchParams],
  );

  const setFilter = useCallback(
    (key, value, options) => setFilters({ [key]: value }, options),
    [setFilters],
  );

  // Clears the filters only: sort, direction and limit are kept, page goes to 1.
  const clear = useCallback(() => {
    const patch = {};
    for (const key of Object.keys(spec)) {
      if (!NOT_A_FILTER.has(key)) patch[key] = spec[key].defaultValue;
    }
    setFilters(patch);
  }, [spec, setFilters]);

  return { filters, setFilter, setFilters, clear, activeCount, apiParams };
}
