import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { cn } from "../../lib/cn.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Popover } from "../ui/Popover.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

// Design §1.3: a 62px block — avatar, name, a role chip, a chevron. It opens a
// popover upward: Account · Appearance (Light / Dark) · Sign out. Sign out is not
// part of the demo (design §3.14), so it is not rendered there.

const ROLE_CHIP = { member: "Member", manager: "Manager", admin: "Admin" };

const ITEM =
  "focus-inset flex h-[34px] w-full items-center px-14 text-dense text-body no-underline transition-colors duration-[120ms] ease-linear hover:bg-tint hover:text-ink";

export function SidebarUserBlock({ rail }) {
  const { user, isDemo, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-hair">
      <Popover
        open={open}
        onOpenChange={setOpen}
        side="top"
        align={rail ? "start" : "center"}
        className="min-w-[200px]"
        trigger={
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`${user.name}, ${ROLE_CHIP[user.role]}. Account menu`}
            className={cn(
              "focus-inset flex h-62 w-full items-center gap-11 text-left transition-colors duration-[120ms] ease-linear hover:bg-tint",
              rail ? "justify-center" : "px-20",
            )}
          >
            <Avatar name={user.name} size={28} />
            {!rail && (
              <>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-4">
                  <span className="max-w-full truncate text-dense leading-none font-medium text-ink">
                    {user.name}
                  </span>
                  <span className="border border-hair bg-tint px-6 py-2 text-micro leading-none font-medium text-mut">
                    {ROLE_CHIP[user.role]}
                  </span>
                </span>
                <ChevronUp
                  aria-hidden="true"
                  className="size-[14px] shrink-0 text-mut"
                />
              </>
            )}
          </button>
        }
      >
        <div className="py-4">
          <Link to="/account" className={ITEM} onClick={() => setOpen(false)}>
            Account
          </Link>
          <div className="mt-4 border-t border-hair px-14 py-8">
            <p className="pb-6 text-micro font-medium text-mut">Appearance</p>
            <ThemeToggle />
          </div>
          {!isDemo && (
            <div className="mt-4 border-t border-hair pt-4">
              <button
                type="button"
                className={cn(ITEM, "text-left")}
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
}
