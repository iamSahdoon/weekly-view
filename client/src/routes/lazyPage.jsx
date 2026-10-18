import { lazy } from "react";
import { guardChunkLoad } from "../lib/chunkReload.js";

// A route's component, loaded on demand — and rendered straight away once it has been.
// `React.lazy` suspends on its first render even when its module is already in the
// browser, and React then holds the revealed page back for 300 ms after the fallback
// commits; so a page the prefetch (routes/prefetch.js) or an earlier visit has loaded
// would still wait a third of a second. Once `loaded` is set the page renders without
// suspending at all; until then it suspends behind the route's fallback as usual. A
// chunk missing after a redeploy reloads the page once (lib/chunkReload.js).
export function lazyPage(loader) {
  let loaded = null;
  const remember = (module) => {
    loaded = module.default;
    return module;
  };
  // Only the render path reloads for a missing chunk (lib/chunkReload.js); `preload`
  // stays a quiet background load whose failure the caller ignores.
  const load = guardChunkLoad(loader);
  const Lazy = lazy(() => load().then(remember));
  function Page(props) {
    const Loaded = loaded;
    return Loaded ? <Loaded {...props} /> : <Lazy {...props} />;
  }
  /** Starts (or joins) the load; the promise settles when the page can render. */
  Page.preload = () => loader().then(remember);
  return Page;
}
