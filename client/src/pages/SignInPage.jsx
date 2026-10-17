import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthLink } from "../components/auth/AuthLink.jsx";
import { AuthPanel, AuthScreen } from "../components/auth/AuthScreen.jsx";
import { SignInForm } from "../components/auth/SignInForm.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useBootstrapStatus, useLogin } from "../hooks/useAuthQueries.js";

// /signin (design §3.12, frontend_architecture.md §9.15). The way to create the owner
// account shows only when the bootstrap check says sign-up is open (owner decision, auth
// pages 2026-10-17); while it is pending or failed, nothing is offered.
export default function SignInPage() {
  const { signIn } = useAuth();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [forgotOpen, setForgotOpen] = useState(false);
  const signupOpen = useBootstrapStatus().data?.available === true;

  const onSignedIn = ({ token, user }) => {
    signIn(token, user);
    navigate(location.state?.from ?? "/", { replace: true });
  };

  return (
    <AuthScreen
      heading="Sign in to WeeklyView"
      title="Sign in"
      footer={
        <>
          <div className="w-full">
            <button
              type="button"
              aria-expanded={forgotOpen}
              onClick={() => setForgotOpen((open) => !open)}
              className="text-acc-txt underline-offset-2 hover:underline"
            >
              Forgot your password?
            </button>
            {forgotOpen && (
              <p className="mt-11 border border-hair bg-tint px-16 py-14 text-dense text-body">
                Ask an admin to create a password reset link for you. WeeklyView
                doesn't send emails, so the link comes from them.
              </p>
            )}
          </div>
          {signupOpen && (
            <AuthLink to="/signup">
              No team here yet? Create the owner account
            </AuthLink>
          )}
        </>
      }
    >
      <AuthPanel>
        <SignInForm
          login={login}
          onSignedIn={onSignedIn}
          // From a sign-up or invite whose answer was lost (ResponseLost).
          defaultEmail={location.state?.email ?? ""}
        />
      </AuthPanel>
    </AuthScreen>
  );
}
