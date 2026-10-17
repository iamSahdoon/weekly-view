import { Link } from "react-router-dom";
import { Button } from "../ui/Button.jsx";
import { useAuthIntro } from "./authIntro.js";

// When a request that creates an account (A2) or uses a link (A8) got no response, and the
// server then says it already happened — sign-up closed, the link used — the write most
// likely went through and only its answer was lost (owner report, 2026-10-17). Say so, and
// carry the email to the sign-in form, instead of "invite-only" or "expired". Drawn like the
// expired-link block (design §3.12).

export function ResponseLost({
  email,
  title = "Your account may already have been created.",
  line = "Sign in with the email you just used.",
}) {
  useAuthIntro("lost", { override: true });
  return (
    <div role="status" className="bg-tint p-32 max-xs:p-20 lg:h-full">
      <p className="text-base font-medium text-ink">{title}</p>
      <p className="mt-4 text-base text-body">{line}</p>
      <Button asChild className="mt-20">
        <Link to="/signin" state={{ email }}>
          Sign in
        </Link>
      </Button>
    </div>
  );
}
