import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { ThemeToggle } from "../components/shell/ThemeToggle.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Field } from "../components/ui/Field.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Meter } from "../components/ui/Meter.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { RoleChip } from "../components/ui/RoleChip.jsx";
import { Switch } from "../components/ui/Switch.jsx";
import { LeaveToggleHost } from "../components/user/LeaveToggleHost.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useChangePassword, useUpdateMe } from "../hooks/useUserQueries.js";
import { ROLE_LABELS } from "../lib/constants.js";
import { errorCopy } from "../lib/errorCopy.js";
import { reportServerError } from "../lib/formErrors.js";
import { passwordStrength } from "../lib/passwordStrength.js";
import { emailChangeHint } from "../lib/permissions.js";
import { passwordSchema, profileSchema } from "../schemas/userSchema.js";

// Account — /account, every role (design §3.11, frontend_architecture.md §9.14). A person's
// view of themselves: four panels in one column. Profile (name editable; email, role and
// projects read-only, and who to ask for an email change), Password (the new token replaces
// the old, so this session carries on and every other ends), Appearance (this device) and
// Leave (a switch; turning it off asks first). A failed save is an inline error above the
// panel's button with the values kept; nothing here toasts a success.

export default function AccountPage() {
  const { user: me } = useAuth();
  return (
    <>
      <PageHeader title="Account" />
      <PageContainer size="doc">
        <div className="flex flex-col gap-32">
          <ProfilePanel me={me} />
          <PasswordPanel />
          <Panel title="Appearance" data-tour="account-appearance">
            <div className="flex flex-wrap items-center gap-14">
              <ThemeToggle />
              <span className="text-caption text-mut">
                Applies to this device.
              </span>
            </div>
          </Panel>
          <LeavePanel me={me} />
        </div>
      </PageContainer>
    </>
  );
}

function EmailHint({ me }) {
  const hint = emailChangeHint(me);
  if (hint.kind === "owner") {
    return (
      <p className="text-caption text-mut">
        You can change your email on the{" "}
        <Link
          to={`/users?q=${encodeURIComponent(me.email)}`}
          className="text-acc-txt underline underline-offset-2"
        >
          Users page
        </Link>
        .
      </p>
    );
  }
  const owner = hint.ownerName ? (
    <>
      <a
        href={hint.mailto}
        className="font-medium text-acc-txt underline underline-offset-2"
      >
        {hint.ownerName}
      </a>{" "}
      <span className="font-mono select-all">({hint.ownerEmail})</span>
    </>
  ) : (
    "the owner"
  );
  return (
    <p className="text-caption text-mut">
      To change your email, ask the owner, {owner}
      {hint.kind === "other" ? ", or any admin." : "."}
    </p>
  );
}

function ProfilePanel({ me }) {
  const update = useUpdateMe();
  const form = useForm({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: { name: me.name },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = ({ name }) =>
    update.mutate(
      { name },
      {
        onSuccess: (user) => form.reset({ name: user.name }),
        onError: (error) => reportServerError(form, error, errorCopy),
      },
    );

  return (
    <Panel
      title="Profile"
      data-tour="account-profile"
      footer={
        <Button
          type="submit"
          form="account-profile"
          disabled={!isDirty}
          loading={update.isPending}
        >
          Save changes
        </Button>
      }
    >
      <form
        id="account-profile"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-16"
      >
        <div className="flex items-center gap-14">
          <Avatar name={me.name} size={44} />
          <RoleChip role={me.role} />
          <span className="text-dense text-body">{ROLE_LABELS[me.role]}</span>
        </div>
        <Field label="Display name" error={errors.name}>
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <div className="flex flex-col gap-6">
          <Field label="Email">
            <Input readOnly value={me.email} />
          </Field>
          <EmailHint me={me} />
        </div>
        <div className="flex flex-col gap-4">
          <span className="text-dense font-medium text-ink">Projects</span>
          <p className="text-dense text-body">
            {me.projects.length
              ? me.projects.map((p) => p.name).join(", ")
              : "Not on a project yet."}
          </p>
        </div>
        {errors.root?.server && (
          <InlineError title="Your changes weren’t saved.">
            {errors.root.server.message}
          </InlineError>
        )}
      </form>
    </Panel>
  );
}

function PasswordPanel() {
  const change = useChangePassword();
  const [changed, setChanged] = useState(false);
  const form = useForm({
    resolver: zodResolver(passwordSchema),
    mode: "onTouched",
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });
  const { errors } = form.formState;
  const strength = passwordStrength(form.watch("newPassword"));

  const onSubmit = ({ currentPassword, newPassword }) =>
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset();
          setChanged(true);
        },
        onError: (error) => {
          if (error?.code === "CURRENT_PASSWORD_INCORRECT") {
            form.setError("currentPassword", {
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
    <Panel
      title="Password"
      footer={
        <Button
          type="submit"
          form="account-password"
          loading={change.isPending}
        >
          Change password
        </Button>
      }
    >
      <form
        id="account-password"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        onChange={() => setChanged(false)}
        className="flex flex-col gap-16"
      >
        <Field label="Current password" error={errors.currentPassword}>
          <Input
            type="password"
            autoComplete="current-password"
            {...form.register("currentPassword")}
          />
        </Field>
        <div className="flex flex-col gap-8">
          <Field label="New password" error={errors.newPassword}>
            <Input
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
          </Field>
          <Meter value={strength.score / 4} label="Password strength" />
          <p className="min-h-[18px] text-caption text-mut">{strength.label}</p>
        </div>
        <Field label="Confirm new password" error={errors.confirm}>
          <Input
            type="password"
            autoComplete="new-password"
            {...form.register("confirm")}
          />
        </Field>
        {errors.root?.server && (
          <InlineError title="Your password wasn’t changed.">
            {errors.root.server.message}
          </InlineError>
        )}
        {changed && (
          <p role="status" className="text-dense text-ink">
            Password changed. Your other devices are signed out.
          </p>
        )}
        <p className="text-caption text-mut">
          Other devices will be signed out.
        </p>
      </form>
      <p className="mt-16 border-t border-hair pt-14 text-caption text-mut">
        If you can’t remember your current password, ask an admin for a reset
        link.
      </p>
    </Panel>
  );
}

function LeavePanel({ me }) {
  return (
    <LeaveToggleHost>
      {({ request, pending }) => (
        <Panel title="Leave" data-tour="account-leave">
          <div className="flex flex-col gap-8">
            <Switch
              label="I’m on leave"
              checked={me.onLeave}
              disabled={pending}
              onCheckedChange={() => request(me)}
            />
            <p className="text-caption text-mut">
              Your team sees that you’re away, and days you’re away need no
              update.
            </p>
          </div>
        </Panel>
      )}
    </LeaveToggleHost>
  );
}
