import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { AuthPanel, AuthScreen } from "../components/auth/AuthScreen.jsx";
import { FormStrip } from "../components/auth/FormStrip.jsx";
import { LinkExpired } from "../components/auth/LinkExpired.jsx";
import { LinkPreviewGate } from "../components/auth/LinkPreviewGate.jsx";
import { ResponseLost } from "../components/auth/ResponseLost.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Input } from "../components/ui/Input.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useAcceptLink } from "../hooks/useAuthQueries.js";
import { ROLE_LABELS } from "../lib/constants.js";
import { linkFailureScreen } from "../lib/authRecovery.js";
import { errorCopy } from "../lib/errorCopy.js";
import { reportServerError } from "../lib/formErrors.js";
import { acceptInviteSchema } from "../schemas/authSchema.js";

// /invite/:token (design §3.12): email and role read-only, then name and password.
export default function AcceptInvitePage() {
  const { token } = useParams();
  return (
    <AuthScreen heading="Join the team" intro="invite">
      <LinkPreviewGate token={token} purpose="invite">
        {(preview) => <AcceptInviteForm token={token} preview={preview} />}
      </LinkPreviewGate>
    </AuthScreen>
  );
}

function AcceptInviteForm({ token, preview }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const accept = useAcceptLink();
  const form = useForm({
    resolver: zodResolver(acceptInviteSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { name: "", password: "" },
  });
  const { errors } = form.formState;
  // An earlier try got no response. If the link is now used up, that try most likely
  // went through (owner report, 2026-10-17): say so instead of "expired".
  const [responseLost, setResponseLost] = useState(false);

  const failure = linkFailureScreen(accept.error, responseLost);
  if (failure)
    return failure === "lost" ? (
      <ResponseLost email={preview.email} />
    ) : (
      <LinkExpired />
    );

  const onSubmit = ({ name, password }) =>
    accept.mutate(
      { token, name, password },
      {
        onSuccess: ({ token: session, user }) => {
          signIn(session, user);
          navigate("/", { replace: true });
        },
        onError: (error) => {
          reportServerError(form, error, errorCopy);
          if (error.isNetwork) setResponseLost(true);
        },
      },
    );

  const formLevelError = errors.root?.server?.message;

  return (
    <AuthPanel>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset disabled={accept.isPending} className="flex flex-col gap-20">
          <Field label="Email">
            <Input size="lg" readOnly value={preview.email} />
          </Field>
          <Field label="Role">
            <Input size="lg" readOnly value={ROLE_LABELS[preview.role] ?? ""} />
          </Field>
          <Field label="Name" error={errors.name}>
            <Input size="lg" autoComplete="name" {...form.register("name")} />
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
            loading={accept.isPending}
            className="w-full"
          >
            Join the team
          </Button>
        </fieldset>
      </form>
    </AuthPanel>
  );
}
