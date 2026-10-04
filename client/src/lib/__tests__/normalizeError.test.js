import { describe, expect, it } from "vitest";
import { normalizeError } from "../normalizeError.js";

const response = (status, data) => ({ response: { status, data } });

describe("normalizeError", () => {
  it("maps the envelope, its fields and its extra keys", () => {
    const error = normalizeError(
      response(422, {
        success: false,
        data: null,
        message: "Check the fields.",
        error: {
          code: "VALIDATION_FAILED",
          fields: { "lines.0.hours": "Enter more than zero." },
        },
      }),
    );
    expect(error).toMatchObject({
      name: "ApiError",
      httpStatus: 422,
      code: "VALIDATION_FAILED",
      fields: { "lines.0.hours": "Enter more than zero." },
      details: null,
      isNetwork: false,
    });

    const conflict = normalizeError(
      response(409, {
        success: false,
        message: "Changed.",
        error: { code: "REPORT_STATE_CHANGED", status: "approved" },
      }),
    );
    expect(conflict.details).toEqual({ status: "approved" });
    expect(conflict.httpStatus).toBe(409);
  });

  it("treats no response as a network error, and a timeout as TIMEOUT", () => {
    expect(normalizeError({ code: "ERR_NETWORK" })).toMatchObject({
      httpStatus: 0,
      code: "NETWORK_ERROR",
      isNetwork: true,
    });
    expect(normalizeError({ code: "ECONNABORTED" }).code).toBe("TIMEOUT");
  });

  it("treats a response that isn't the envelope as INTERNAL_ERROR", () => {
    expect(
      normalizeError(response(502, "<html>Bad gateway</html>")),
    ).toMatchObject({
      httpStatus: 502,
      code: "INTERNAL_ERROR",
    });
  });
});
