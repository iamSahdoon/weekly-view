import { TransitionLink } from "../../routes/TransitionLink.jsx";

// The landing page's links into the app (owner decision, auth pages round six, replacing
// "the landing page's links are full page loads"): /signin and /signup open client-side,
// in a view transition (TransitionLink). Only the link moves into React Router; the
// landing page's styles stay scoped to `.landing` and its font is removed when it unmounts,
// so nothing of the landing look reaches the auth screens. /demo stays a plain <a>: the
// demo is a different page load (frontend_architecture.md §3.1).

export function AppLink({ href, ...props }) {
  if (href === "/signin" || href === "/signup")
    return <TransitionLink to={href} {...props} />;
  return <a href={href} {...props} />;
}
