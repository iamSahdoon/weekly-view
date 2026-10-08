import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useChangeEmail } from "../../hooks/useUserQueries.js";
import { firstNameOf } from "../../lib/format.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { reportServerError } from "../../lib/formErrors.js";
import { changeEmailSchema } from "../../schemas/userSchema.js";
import { Button } from "../ui/Button.jsx";
import { Field } from "../ui/Field.jsx";
import { InlineError } from "../ui/InlineError.jsx";
import { Input } from "../ui/Input.jsx";
import { Modal } from "../ui/Modal.jsx";

// Edit email (design §3.10): the current address read-only, a new one, and the effect —
// the person is signed out and must use the new address. An address already in use is an
// inline field error. Mount it when it opens.

export function EditEmailModal({ person, isSelf, open, onOpenChange }) {
  const change = useChangeEmail();
  const form = useForm({
    resolver: zodResolver(changeEmailSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  });
  const { errors } = form.formState;
  const who = isSelf ? "You" : firstNameOf(person.name) || "They";

  const onSubmit = ({ email }) =>
    change.mutate(
      { userId: person._id, email },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          if (error?.code === "USER_EXISTS") {
            form.setError("email", {
              type: "server",
              message: errorCopy(error),
            });
          } else {
            reportServerError(form, error, errorCopy);
          }
        },
      },
    );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Edit email"
      description={`Change the email address of ${person.name}`}
      dismissible={!change.isPending}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={change.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-email" loading={change.isPending}>
            Change email
          </Button>
        </>
      }
    >
      <form
        id="edit-email"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-16"
      >
        <Field label="Current email">
          <Input readOnly value={person.email} />
        </Field>
        <Field label="New email" error={errors.email}>
          <Input type="email" autoComplete="off" {...form.register("email")} />
        </Field>
        <p className="text-caption text-mut">
          {who} will be signed out and must sign in with the new address.
        </p>
        {errors.root?.server && (
          <InlineError title="The email wasn’t changed.">
            {errors.root.server.message}
          </InlineError>
        )}
      </form>
    </Modal>
  );
}
