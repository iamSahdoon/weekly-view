import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useAuth } from "../../hooks/useAuth.js";
import { useProjects } from "../../hooks/useProjectQueries.js";
import { useInviteUser } from "../../hooks/useUserQueries.js";
import { ROLE_LABELS, ROLES } from "../../lib/constants.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { reportServerError } from "../../lib/formErrors.js";
import { inviteSchema } from "../../schemas/userSchema.js";
import { Button } from "../ui/Button.jsx";
import { Field } from "../ui/Field.jsx";
import { InlineError } from "../ui/InlineError.jsx";
import { Input } from "../ui/Input.jsx";
import { Modal } from "../ui/Modal.jsx";
import { MultiSelect } from "../ui/MultiSelect.jsx";
import { Select } from "../ui/Select.jsx";
import { LinkBlock } from "./LinkState.jsx";

// Invite person (design §3.10): email, role, projects (optional); `Create invite link`
// — not "Send", because nothing is sent. The link comes back once (U3), and the modal
// swaps its body for it instead of closing: closing would destroy the only copy. The URL
// is component state; the mutation is reset the moment it has been read, so the query
// cache never holds it. Only the owner may invite an admin (U3). Mount it when it opens.

export function InviteModal({ open, onOpenChange }) {
  const { user: me } = useAuth();
  const invite = useInviteUser();
  const projects = useProjects({ status: "active" });
  const [issued, setIssued] = useState(null);
  const form = useForm({
    resolver: zodResolver(inviteSchema),
    mode: "onTouched",
    defaultValues: { email: "", role: "member", projects: [] },
  });
  const { errors } = form.formState;

  const projectOptions = (projects.data?.items ?? []).map((p) => ({
    value: p._id,
    label: p.name,
  }));
  const roleOptions = ROLES.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
    disabled: role === "admin" && !me.isOwner,
  }));

  const onSubmit = (values) =>
    invite.mutate(values, {
      onSuccess: (data) => {
        setIssued({ url: data.linkUrl, role: values.role });
        invite.reset(); // the link now lives in this component only
      },
      onError: (error) => {
        if (error?.code === "USER_EXISTS") {
          form.setError("email", { type: "server", message: errorCopy(error) });
        } else {
          reportServerError(form, error, errorCopy);
        }
      },
    });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={issued ? "Invite link" : "Invite person"}
      description="Invite someone to the team"
      dismissible={!invite.isPending}
      footer={
        issued ? (
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        ) : (
          <>
            <Button
              variant="secondary"
              disabled={invite.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="invite-form" loading={invite.isPending}>
              Create invite link
            </Button>
          </>
        )
      }
    >
      {issued ? (
        <LinkBlock url={issued.url}>
          Anyone with this link can join as {ROLE_LABELS[issued.role]}. It works
          once and expires in 7 days.
        </LinkBlock>
      ) : (
        <form
          id="invite-form"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-16"
        >
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              autoComplete="off"
              placeholder="name@example.com"
              {...form.register("email")}
            />
          </Field>
          <Field label="Role" error={errors.role}>
            <Select options={roleOptions} {...form.register("role")} />
          </Field>
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between">
              <span className="text-dense font-medium text-ink">Projects</span>
              <span className="text-micro text-mut">Optional</span>
            </div>
            <Controller
              control={form.control}
              name="projects"
              render={({ field }) => (
                <MultiSelect
                  label="Projects"
                  options={projectOptions}
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                />
              )}
            />
          </div>
          {errors.root?.server && (
            <InlineError title="The invite wasn’t created.">
              {errors.root.server.message}
            </InlineError>
          )}
        </form>
      )}
    </Modal>
  );
}
