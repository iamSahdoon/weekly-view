import { createContext, useContext, useLayoutEffect } from "react";

// The channel from an auth screen to the brand panel beside it (AuthLayout provides it):
// the screen's own line (`setBase`), and a state inside it that replaces the line while it
// shows (`setOverride`: an expired link, a lost answer). Keys are PANEL_INTROS' keys. The
// current `override` is shared too, so the screen can lay itself out as a short one.

export const AuthIntroContext = createContext(null);

export function useAuthIntro(key, { override = false } = {}) {
  // The setters never change, so a new `override` value never re-runs this effect.
  const { setBase, setOverride } = useContext(AuthIntroContext) ?? {};
  useLayoutEffect(() => {
    if (!setBase || !key) return undefined;
    if (!override) {
      setBase(key);
      return undefined;
    }
    setOverride(key);
    return () => setOverride(null);
  }, [setBase, setOverride, key, override]);
}
