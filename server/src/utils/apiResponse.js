export function ok(res, data = null, message = null, status = 200) {
  return res.status(status).json({ success: true, data, message, error: null });
}
