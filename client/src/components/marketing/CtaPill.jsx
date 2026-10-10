import { cn } from "../../lib/cn.js";

// The landing page's pill action (reference `.pill`): a pill with the arrow circle, or
// the quiet outlined `ghost` that sits beside a primary one. Always a plain link: the
// demo is a different page load (frontend_architecture.md §3.1), and the sign-in and
// sign-up screens are better entered fresh, so the landing styles never stay behind
// in the app's session.

export function CtaPill({
  href,
  size,
  variant = "solid",
  className,
  children,
  ...props
}) {
  return (
    <a
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
    </a>
  );
}
