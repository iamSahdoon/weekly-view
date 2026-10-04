// applyServerErrors (frontend_architecture.md §6.1): every `fields` path the form
// has becomes a field error; the messages for paths it doesn't have are returned
// for a form-level InlineError above the buttons.

export function applyServerErrors(form, apiError) {
  const fields = apiError?.fields;
  if (!fields) return [];
  const values = form.getValues();
  const unmatched = [];
  let focused = false;
  for (const [path, message] of Object.entries(fields)) {
    if (hasPath(values, path)) {
      form.setError(
        path,
        { type: "server", message },
        { shouldFocus: !focused },
      );
      focused = true;
    } else {
      unmatched.push(message);
    }
  }
  return unmatched;
}

function hasPath(values, path) {
  let node = values;
  for (const part of path.split(".")) {
    if (node == null || typeof node !== "object" || !(part in node))
      return false;
    node = node[part];
  }
  return true;
}

/**
 * applyServerErrors, plus everything that has no field — unmatched paths, or any
 * other code's copy — as the form's root error, for the form-level message.
 * RHF clears root errors on the next submit.
 */
export function reportServerError(form, apiError, copy) {
  const unmatched =
    apiError?.code === "VALIDATION_FAILED" || apiError?.fields
      ? applyServerErrors(form, apiError)
      : [copy(apiError)];
  if (unmatched.length) {
    form.setError("root.server", {
      type: "server",
      message: unmatched.join(" "),
    });
  }
}
