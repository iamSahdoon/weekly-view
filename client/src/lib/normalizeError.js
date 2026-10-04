// Maps whatever axios rejects with to an ApiError (frontend_architecture.md §5.1,
// FA3), so no component touches axios internals.

export class ApiError extends Error {
  constructor({ httpStatus, code, message, fields = null, details = null }) {
    super(message);
    this.name = "ApiError";
    this.httpStatus = httpStatus; // 0 when no response arrived
    this.code = code;
    this.fields = fields; // VALIDATION_FAILED (and CURRENT_PASSWORD_INCORRECT) only; dot paths
    this.details = details; // the API's extra keys: { status } | { reason } | null
    this.isNetwork = httpStatus === 0;
  }
}

const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);

export function normalizeError(error) {
  if (error instanceof ApiError) return error;

  const response = error?.response;
  if (!response) {
    const timedOut = TIMEOUT_CODES.has(error?.code);
    return new ApiError({
      httpStatus: 0,
      code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      message: "Couldn't reach the server.",
    });
  }

  const envelope = response.data;
  const apiError =
    envelope && typeof envelope === "object" ? envelope.error : null;
  if (!apiError?.code) {
    // A response that isn't the envelope: a proxy page, Render waking up.
    return new ApiError({
      httpStatus: response.status,
      code: "INTERNAL_ERROR",
      message: "Something went wrong on the server.",
    });
  }

  const { code, fields, ...extra } = apiError;
  return new ApiError({
    httpStatus: response.status,
    code,
    message: envelope.message ?? "Something went wrong on the server.",
    fields: fields ?? null,
    details: Object.keys(extra).length ? extra : null,
  });
}
