import { Link } from "react-router-dom";
import { Button } from "../ui/Button.jsx";
import { useAuthIntro } from "./authIntro.js";

// One state for every dead link — expired, used, unknown, wrong purpose — so a
// stranger holding an old link learns nothing (design §3.12).

export function LinkExpired() {
  useAuthIntro("expired", { override: true });
  return (
    <div className="bg-tint p-32 max-xs:p-20 lg:h-full">
      <p className="text-base font-medium text-ink">
        This link has expired or has already been used.
      </p>
      <p className="mt-4 text-base text-body">Ask an admin for a new one.</p>
      <Button asChild variant="secondary" className="mt-20">
        <Link to="/signin">Back to sign in</Link>
      </Button>
    </div>
  );
}
