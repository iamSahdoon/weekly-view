import { Link } from "react-router-dom";

// The one secondary text link under an auth panel.
export function AuthLink({ to, children }) {
  return (
    <Link to={to} className="text-acc-txt underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
