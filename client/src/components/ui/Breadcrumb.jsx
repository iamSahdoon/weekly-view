import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";

// Design §6.20: the one three-level route (People → Nadia F. → Week 31), and
// nothing else. A --hair2 slash separates; the current page is --ink and not a
// link. The middle segment truncates below 900px.

export function Breadcrumb({ items, className }) {
  const last = items.length - 1;
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center text-caption text-mut">
        {items.map((item, index) => (
          <li
            key={`${index}-${item.label}`}
            className={cn(
              "flex min-w-0 items-center",
              index > 0 && index < last && "max-[900px]:max-w-[96px]",
            )}
          >
            {index > 0 && (
              <span aria-hidden="true" className="px-6 text-hair2">
                /
              </span>
            )}
            {index === last ? (
              <span aria-current="page" className="truncate text-ink">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                className="truncate underline-offset-2 hover:text-ink hover:underline"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
