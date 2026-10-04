import { toast } from "sonner";
import { errorCopy } from "./errorCopy.js";

// A failed write that has no form to show it in (frontend_architecture.md §5.7):
// an error toast with `Retry`. It stays until dismissed (design §6.12) and `id`
// makes a second failure of the same control replace the first, not stack.

export function toastError(title, error, { id, retry }) {
  toast.error(title, {
    id,
    description: errorCopy(error),
    duration: Infinity,
    action: retry ? { label: "Retry", onClick: retry } : undefined,
  });
}
