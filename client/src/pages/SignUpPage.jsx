import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AuthLink } from "../components/auth/AuthLink.jsx";
import { AuthPanel, AuthScreen } from "../components/auth/AuthScreen.jsx";
import { FormStrip } from "../components/auth/FormStrip.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Field } from "../components/ui/Field.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useBootstrapStatus, useSignUp } from "../hooks/useAuthQueries.js";
import { errorCopy } from "../lib/errorCopy.js";
import { reportServerError } from "../lib/formErrors.js";
import { signUpSchema } from "../schemas/authSchema.js";

// /signup: first-run bootstrap; the closed state is the usual one (design §3.12). The open
// state says plainly that this is the team's owner account and that everyone else joins
// by invite (owner decision, auth pages 2026-10-17).

const OPEN_HEADING = "Create the owner account";
export default function SignUpPage() {
  const bootstrap = useBootstrapStatus();

  if (bootstrap.isPending) {
    return (
      <AuthScreen heading={OPEN_HEADING}>
        <AuthPanel>
          <div className="flex flex-col gap-20">
            <Skeleton className="h-[67px]" />
            <Skeleton className="h-[67px]" />
            <Skeleton className="h-[67px]" />
            <Skeleton className="h-[var(--ctrl-h-lg)]" />
          </div>
        </AuthPanel>
      </AuthScreen>
    );
  }
  if (bootstrap.isError) {
    return (
      <AuthScreen heading={OPEN_HEADING}>
        <InlineError
          title={errorCopy(bootstrap.error)}
          onRetry={() => bootstrap.refetch()}
        >
          The sign-up form needs the server to answer first.
        </InlineError>
      </AuthScreen>
    );
  }
  return bootstrap.data.available ? <SignUpForm /> : <SignUpClosed />;
}

function SignUpClosed() {
  return (
    <AuthScreen
      heading="This team is invite-only."
      line="Ask an admin for an invite link. You can look around the demo in the meantime."
      footer={
        <AuthLink to="/signin">Already have an account? Sign in</AuthLink>
      }
    >
      <Button asChild size="lg">
        {/* A plain link: the demo is a different page load (frontend_architecture.md §3.1). */}
        <a href="/demo">Open the demo</a>
      </Button>
    </AuthScreen>
  );
}

function SignUpForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const signUp = useSignUp();
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    // Design §4.10: on blur first, then on every change once a field has been touched.
    mode: "onTouched",
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = (values) =>
    signUp.mutate(values, {
      onSuccess: ({ token, user }) => {
        signIn(token, user);
        navigate("/", { replace: true });
      },
      onError: (error) => reportServerError(form, error, errorCopy),
    });

  const formLevelError = errors.root?.server?.message;

  return (
    <AuthScreen
      heading={OPEN_HEADING}
      line="You're the first person here, so this account will be the admin and the owner. Everyone else joins with an invite link from you."
      footer={
        <AuthLink to="/signin">Already have an account? Sign in</AuthLink>
      }
    >
      <AuthPanel>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset
            disabled={signUp.isPending}
            className="flex flex-col gap-20"
          >
            <Field label="Name" error={errors.name}>
              <Input size="lg" autoComplete="name" {...form.register("name")} />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input
                size="lg"
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
            </Field>
            <Field
              label="Password"
              helper="At least 8 characters."
              error={errors.password}
            >
              <Input
                size="lg"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
            </Field>
            {formLevelError && <FormStrip>{formLevelError}</FormStrip>}
            <Button
              type="submit"
              size="lg"
              loading={signUp.isPending}
              className="w-full"
            >
              Create account
            </Button>
          </fieldset>
        </form>
      </AuthPanel>
    </AuthScreen>
  );
}
