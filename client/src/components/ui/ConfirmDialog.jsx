import { Button } from "./Button.jsx";
import { Modal } from "./Modal.jsx";

// The destructive confirm (frontend_architecture.md §8.1): the consequence in
// the body — never "Are you sure?" alone — then Cancel and the action.

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  onConfirm,
  pending = false,
  destructive = true,
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={title}
      dismissible={!pending}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            loading={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-base text-body">{children}</div>
    </Modal>
  );
}
