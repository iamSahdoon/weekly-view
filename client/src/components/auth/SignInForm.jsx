import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { errorCopy } from "../../lib/errorCopy.js";
import { signInSchema } from "../../schemas/authSchema.js";
import { Button } from "../ui/Button.jsx";
import { Field } from "../ui/Field.jsx";
import { Input } from "../ui/Input.jsx";
import { FormStrip } from "./FormStrip.jsx";

// The sign-in form body, shared by /signin and the session-expiry modal. The
// parent owns the login mutation; with `showSubmit={false}` it renders the
// submit button itself (`form={formId}`), as the modal's footer does.

export function SignInForm({
  formId,
  login,
  defaultEmail = "",
  onSignedIn,
  showSubmit = true,
}) {
  const form = useForm({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { email: defaultEmail, password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = (values) => login.mutate(values, { onSuccess: onSignedIn });

  return (
    <form id={formId} noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <fieldset disabled={login.isPending} className="flex flex-col gap-20">
        <Field label="Email" error={errors.email}>
          <Input
            size="lg"
            type="email"
            autoComplete="email"
            {...form.register("email")}
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <Input
            size="lg"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
        </Field>
        {login.error && <FormStrip>{errorCopy(login.error)}</FormStrip>}
        {showSubmit && (
          <Button
            type="submit"
            size="lg"
            loading={login.isPending}
            className="w-full"
          >
            Sign in
          </Button>
        )}
      </fieldset>
    </form>
  );
}
