import { createContext, useContext, useMemo, useState } from "react";

// The TopBar's slot targets (frontend_architecture.md §7.3). TopBar registers the
// DOM nodes; a page's <PageHeader/> portals its parts into them. A portal rather
// than a config object held here means the actions' closures stay with the page
// that owns the state, and a page changing state never re-renders the shell.

const PageChromeContext = createContext(null);

const SLOTS = ["back", "title", "weekPicker", "secondary", "primary"];

export function PageChromeProvider({ children }) {
  const [slots, setSlots] = useState({});
  const [hasSecondary, setHasSecondary] = useState(false);

  // One stable ref callback per slot: a new function each render would make React
  // detach and re-attach the node, and the state change would loop.
  const slotRefs = useMemo(
    () =>
      Object.fromEntries(
        SLOTS.map((name) => [
          name,
          (node) =>
            setSlots((current) =>
              current[name] === node ? current : { ...current, [name]: node },
            ),
        ]),
      ),
    [],
  );

  const value = useMemo(
    () => ({ slots, slotRefs, hasSecondary, setHasSecondary }),
    [slots, slotRefs, hasSecondary],
  );

  return (
    <PageChromeContext.Provider value={value}>
      {children}
    </PageChromeContext.Provider>
  );
}

export function usePageChrome() {
  const chrome = useContext(PageChromeContext);
  if (!chrome)
    throw new Error("usePageChrome must be used inside PageChromeProvider");
  return chrome;
}
