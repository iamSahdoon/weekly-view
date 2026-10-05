import { useEffect, useState } from "react";

// False on the first render, true from the first effect on. Charts pass it to
// `isAnimationActive`, so a change of data eases (design §8.2 #17) and the mount doesn't
// animate (§7.5). Reduced motion applies the data at once, as §8.3 says.

export function useHasMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMounted(!reduced);
  }, []);
  return mounted;
}
