import { PAGE_LIMITS } from "./constants.js";
import { isWeekKey } from "./dates.js";

// Param descriptors for useUrlFilters (frontend_architecture.md §4.2), framework-free.
// Each turns a raw search-param string into a value and back. An invalid value
// parses to the default — a hand-edited URL never errors — and a default value
// serializes to null, so it is never written to the URL.

function descriptor({ parse, serialize, defaultValue, api }) {
  return {
    defaultValue,
    parse: (raw) => (raw == null || raw === "" ? defaultValue : parse(raw)),
    serialize: (value) =>
      isSame(value, defaultValue) ? null : serialize(value),
    isDefault: (value) => isSame(value, defaultValue),
    // The API's form: lists as comma strings (api_specification.md §1.7).
    toApi: api ?? serialize,
  };
}

function isSame(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => v === b[i])
    );
  }
  return a === b;
}

/** One value from a fixed list. */
export function enumParam(values, defaultValue = null) {
  return descriptor({
    defaultValue,
    parse: (raw) => (values.includes(raw) ? raw : defaultValue),
    serialize: (value) => value,
  });
}

/** A comma list, e.g. ?person=id1,id2. With `allowed`, unknown values are dropped. */
export function listParam(allowed = null) {
  return descriptor({
    defaultValue: [],
    parse: (raw) => {
      const values = [...new Set(raw.split(",").map((v) => v.trim()))].filter(
        Boolean,
      );
      return allowed ? values.filter((v) => allowed.includes(v)) : values;
    },
    serialize: (value) => (value.length ? value.join(",") : null),
  });
}

/** A weekKey, or null. */
export function weekParam() {
  return descriptor({
    defaultValue: null,
    parse: (raw) => (isWeekKey(raw) ? raw : null),
    serialize: (value) => value,
  });
}

/** Free text, trimmed, at most 100 characters (the API's `q`). */
export function textParam() {
  return descriptor({
    defaultValue: "",
    parse: (raw) => raw.trim().slice(0, 100),
    serialize: (value) => (value ? value : null),
  });
}

/** A 1-based page; anything else is page 1. Always sent to the API. */
export function pageParam() {
  return {
    ...descriptor({
      defaultValue: 1,
      parse: (raw) => {
        const n = Number(raw);
        return Number.isInteger(n) && n >= 1 ? n : 1;
      },
      serialize: (value) => String(value),
    }),
    alwaysSent: true,
  };
}

/** 20 | 50 | 100, default 20 — anything else is dropped. Always sent. */
export function limitParam() {
  return {
    ...descriptor({
      defaultValue: 20,
      parse: (raw) => {
        const n = Number(raw);
        return PAGE_LIMITS.includes(n) ? n : 20;
      },
      serialize: (value) => String(value),
    }),
    alwaysSent: true,
  };
}

/** Read every param of a spec from URLSearchParams. */
export function parseParams(spec, searchParams) {
  return Object.fromEntries(
    Object.entries(spec).map(([key, param]) => [
      key,
      param.parse(searchParams.get(key)),
    ]),
  );
}

/** Values → the query object sent to the API: empty values dropped. */
export function toApiParams(spec, values) {
  const out = {};
  for (const [key, param] of Object.entries(spec)) {
    const value = values[key];
    if (param.alwaysSent) {
      out[key] = value;
      continue;
    }
    if (
      value == null ||
      value === "" ||
      (Array.isArray(value) && !value.length)
    )
      continue;
    out[key] = Array.isArray(value) ? value.join(",") : value;
  }
  return out;
}
