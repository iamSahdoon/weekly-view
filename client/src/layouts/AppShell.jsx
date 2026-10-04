import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion as Motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { OfflineStrip } from "../components/shell/OfflineStrip.jsx";
import { Sidebar } from "../components/shell/Sidebar.jsx";
import { TopBar } from "../components/shell/TopBar.jsx";
import { PageChromeProvider } from "../context/PageChromeContext.jsx";
import { useShellMode } from "../hooks/useShellMode.js";

// The frame for every signed-in page (design §1; frontend_architecture.md §7.1):
// sidebar + top bar + the content column. Below 1024px the sidebar is an
// off-canvas drawer opened from the top bar (200ms in, 140ms out; backdrop
// opacity), closing on backdrop, Esc and route change.
//
// --demo-h is the demo bar's height (36px in the demo, once C10 builds the bar);
// every sticky `top` is calc(<value> + var(--demo-h, 0px)).

const EASE = [0.2, 0, 0, 1];

export default function AppShell() {
  const { mode, toggleCollapsed } = useShellMode();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDrawer = mode === "drawer";
  const drawerRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--demo-h", "0px");
  }, []);

  // A drawer left open at a width where it is no longer a drawer, or across a
  // navigation, closes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, isDrawer]);

  // The route transition (design §8.2 #20): opacity 0→1 over 140ms on the
  // content column only, on navigation — never on the first paint.
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);

  return (
    <PageChromeProvider>
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="flex min-h-[100dvh] bg-paper">
          {!isDrawer && (
            <Sidebar mode={mode} onToggleCollapsed={toggleCollapsed} />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar showMenu={isDrawer} />
            <OfflineStrip />
            <main
              id="main"
              tabIndex={-1}
              className="min-w-0 flex-1 outline-none"
            >
              <Motion.div
                key={pathname}
                initial={settled.current ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.14, ease: EASE }}
              >
                <Outlet />
              </Motion.div>
            </main>
          </div>
        </div>

        <AnimatePresence>
          {isDrawer && drawerOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay forceMount asChild>
                <Motion.div
                  className="fixed inset-0 z-40 bg-[var(--backdrop)]"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.2, ease: EASE },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
                  }}
                />
              </Dialog.Overlay>
              <Dialog.Content
                forceMount
                asChild
                aria-describedby={undefined}
                onOpenAutoFocus={(event) => {
                  // The first nav link, not the brand link.
                  const first = drawerRef.current?.querySelector("nav a");
                  if (first) {
                    event.preventDefault();
                    first.focus();
                  }
                }}
              >
                <Motion.div
                  ref={drawerRef}
                  className="fixed inset-y-0 left-0 z-50"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0, transition: { duration: 0.2, ease: EASE } }}
                  exit={{
                    x: "-100%",
                    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
                  }}
                >
                  <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                  <Sidebar
                    mode="drawer"
                    onNavigate={() => setDrawerOpen(false)}
                  />
                </Motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </PageChromeProvider>
  );
}
