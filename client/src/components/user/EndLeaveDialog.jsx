import { endLeaveCopy } from "../../lib/format.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.jsx";

// Ending leave asks first (owner decision, C4): from This week for yourself, and —
// once the people and users pages exist (C8) — for a manager or admin ending someone
// else's. Leave starts again only by switching it back on, and today becomes a day
// that needs an update.

export function EndLeaveDialog({
  person,
  isSelf,
  open,
  onOpenChange,
  onConfirm,
  pending,
}) {
  const copy = endLeaveCopy(person, isSelf);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      confirmLabel={copy.confirmLabel}
      onConfirm={onConfirm}
      pending={pending}
      destructive={false}
    >
      {copy.body}
    </ConfirmDialog>
  );
}
