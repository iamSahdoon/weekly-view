import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Fragment } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { cn } from "../../lib/cn.js";
import { Button } from "../ui/Button.jsx";
import { BrandMark } from "./BrandMark.jsx";
import { groupsForRole } from "./navItems.js";
import { SidebarNavItem } from "./SidebarNavItem.jsx";
import { SidebarUserBlock } from "./SidebarUserBlock.jsx";

// Design §1: a persistent left sidebar — 240px, or the 62px rail. Sticky, full
// height, --card with a 1px --hair right border. In drawer mode (<1024px) the
// same content sits in AppShell's off-canvas panel at 280px and the collapse
// toggle is not shown. `marks` carries N1's dots and V4's count once C6 and C9
// supply them; until then nothing is marked.

export function Sidebar({ mode, onToggleCollapsed, onNavigate, marks = {} }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const rail = mode === "rail";
  const drawer = mode === "drawer";
  const groups = groupsForRole(user.role);

  const isActive = (item) =>
    (item.match ?? [item.to]).some((pattern) =>
      matchPath({ path: pattern, end: true }, pathname),
    );

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-hair bg-card",
        drawer
          ? "h-full w-[var(--nav-drawer)]"
          : "sticky top-[var(--demo-h,0px)] z-40 h-[calc(100dvh-var(--demo-h,0px))] self-start transition-[width] duration-[160ms] ease-[var(--ease-soft)]",
        !drawer && (rail ? "w-[var(--nav-w-min)]" : "w-[var(--nav-w)]"),
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-hair",
          rail
            ? "h-62 flex-col items-center justify-center gap-2"
            : "h-62 items-center justify-between pr-14 pl-20",
        )}
      >
        <Link
          to="/"
          onClick={onNavigate}
          aria-label="WeeklyView, this week"
          className="focus-halo flex items-center text-[16px]"
        >
          <BrandMark wordmark={!rail} glyphSize={18} />
        </Link>
        {!drawer && (
          <Button
            variant="ghost"
            iconOnly
            onClick={onToggleCollapsed}
            aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
            className="h-26 w-26 [&_svg]:size-[16px]"
          >
            {rail ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto pb-20">
        {groups.map((group, index) => (
          <Fragment key={group.id}>
            {rail ? (
              index > 0 && <hr className="mx-14 my-8 border-hair" />
            ) : (
              <p className="px-20 pt-20 pb-6 text-micro font-medium tracking-normal text-mut">
                {group.label}
              </p>
            )}
            <ul aria-label={group.label}>
              {group.items.map((item) => (
                <li key={item.to}>
                  <SidebarNavItem
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(item)}
                    rail={rail}
                    dot={Boolean(item.dot && marks[item.dot])}
                    count={item.count ? (marks[item.count] ?? 0) : 0}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </nav>

      <SidebarUserBlock rail={rail} />
    </aside>
  );
}
