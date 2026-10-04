import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { useLogin } from "../../hooks/useAuthQueries.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedGuard.js";
import { SignInForm } from "../auth/SignInForm.jsx";
import { Button } from "../ui/Button.jsx";
import { ConfirmDialog } from "../ui/ConfirmDialog.jsx";
import { Modal } from "../ui/Modal.jsx";

const FORM_ID = "reauth-form";

// Session expiry (design §3.12, frontend_architecture.md §3.4): a sign-in form over
// the untouched page. Same person → the cache and every form stay, and active
// queries refetch once (no request is replayed). Someone else → a clean start at
// "/". Sign out, or dismissing, asks first when anything is unsaved.

export function ReAuthModal() {
  const { sessionExpired, user, signIn, signOut } = useAuth();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const login = useLogin();
  const [confirming, setConfirming] = useState(false);

  if (!sessionExpired) return null;

  const onSignedIn = ({ token, user: next }) => {
    const samePerson = next._id === user?._id;
    signIn(token, next); // clears the cache itself when the person changed
    login.reset();
    if (samePerson) queryClient.invalidateQueries({ refetchType: "active" });
    else navigate("/", { replace: true });
  };

  const leave = () => {
    login.reset();
    if (hasUnsavedChanges()) setConfirming(true);
    else signOut();
  };

  return (
    <>
      <Modal
        open
        onOpenChange={(open) => !open && leave()}
        size="sm"
        title="Your session expired"
        dismissible={!login.isPending}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={login.isPending}
              onClick={leave}
            >
              Sign out
            </Button>
            <Button type="submit" form={FORM_ID} loading={login.isPending}>
              Sign in
            </Button>
          </>
        }
      >
        <p className="mb-20 text-base text-body">Sign in to keep working.</p>
        <SignInForm
          formId={FORM_ID}
          login={login}
          defaultEmail={user?.email ?? ""}
          onSignedIn={onSignedIn}
          showSubmit={false}
        />
      </Modal>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Sign out with unsaved changes?"
        confirmLabel="Sign out"
        onConfirm={() => {
          setConfirming(false);
          signOut();
        }}
      >
        What you haven't saved on this page will be lost. Sign in instead to
        keep it.
      </ConfirmDialog>
    </>
  );
}
