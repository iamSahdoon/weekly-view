import { AxiosError } from "axios";
import { matchRoute, notFound } from "./demoRoutes.js";

// The custom axios adapter (tech_stack.md §6.9). It never touches the network:
// an unhandled route is a 404 envelope. A custom adapter isn't checked against
// validateStatus, so it rejects every status ≥ 400 itself (FA16) — otherwise the
// pages' error paths would never run.

export function createDemoAdapter(store, { latency = 150 } = {}) {
  return async (config) => {
    const method = (config.method ?? "get").toLowerCase();
    const route = matchRoute(method, config.url ?? "");
    const request = {
      params: route?.params ?? {},
      query: config.params ?? {},
      body: parseBody(config.data),
    };
    const { status, data, error } = route
      ? route.handler(store, request)
      : notFound();

    // Long enough for the designed loading states to be seen.
    if (latency > 0)
      await new Promise((resolve) => setTimeout(resolve, latency));

    const envelope =
      status < 400
        ? { success: true, data, message: null, error: null }
        : {
            success: false,
            data: null,
            message: error.message,
            error: { code: error.code, ...error.extra },
          };
    const response = {
      status,
      statusText: "",
      data: envelope,
      headers: {},
      config,
    };
    if (status >= 400) {
      throw new AxiosError(
        error.message,
        "ERR_BAD_REQUEST",
        config,
        null,
        response,
      );
    }
    return response;
  };
}

function parseBody(data) {
  if (data == null || data === "") return {};
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}
