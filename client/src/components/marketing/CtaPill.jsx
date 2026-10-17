import { cn } from "../../lib/cn.js";
import { AppLink } from "./AppLink.jsx";

// The landing page's pill action (reference `.pill`): a pill with the arrow circle, or
// the quiet outlined `ghost` that sits beside a primary one. The demo is a plain link (a
// different page load, frontend_architecture.md §3.1); sign in and sign up open
// client-side in a view transition (AppLink; owner decision, auth pages round six).

export function CtaPill({
  href,
  size,
  variant = "solid",
  className,
  children,
  ...props
}) {
  return (
    <AppLink
      href={href}
      className={cn("pill", size, variant === "ghost" && "ghost", className)}
      {...props}
    >
      {children}
      {variant === "solid" && (
        <span className="ic" aria-hidden="true">
          <svg
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M2 7h9M7.5 3.5L11 7l-3.5 3.5" />
          </svg>
        </span>
      )}
    </AppLink>
  );
}
