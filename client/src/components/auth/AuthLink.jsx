import { TransitionLink } from "../../routes/TransitionLink.jsx";

// The one secondary text link under an auth panel. Between the auth screens it opens
// client-side in a view transition, like the links from the landing page (round six).
export function AuthLink({ to, children }) {
  return (
    <TransitionLink
      to={to}
      className="text-acc-txt underline-offset-2 hover:underline"
    >
      {children}
    </TransitionLink>
  );
}
