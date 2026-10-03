// `extra` carries the one additional key a few codes have (api_specification.md §1.9):
// `fields`, `status` or `reason`. It is merged into the envelope's `error` object.
export class AppError extends Error {
  constructor(status, message, code, extra = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
