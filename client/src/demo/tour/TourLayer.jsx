import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useDemoSignIn } from "../../hooks/useAuthQueries.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { demo } from "../bootDemo.js";
import { PERSPECTIVES } from "../fixtures.js";
import { TOUR_EVENT, onTourRequest } from "./tourBus.js";
import {
  clipBelow,
  clipToOpenArea,
  padRect,
  placeTooltip,
  planSheet,
  roomBelow,
  withinView,
} from "./tourPlacement.js";
import { closePageLayers, createRobot } from "./tourRobot.js";
import { prepare, tourContext } from "./tourSetup.js";
import { INITIAL, reducer } from "./tourState.js";
import { AUDIENCES, STEPS } from "./tourSteps.js";
import { TourPanel } from "./TourPanel.jsx";
import { TourTooltip } from "./TourTooltip.jsx";

// The guided tour (owner request, 2026-10-17; frontend_architecture.md §11.6): an overlay
// layer mounted by RootLayout under /demo only, in its own chunk. It never changes a page.
// For each step it prepares the demo store (tourSetup), becomes the step's person through
// the chooser's own sign-in, navigates, waits for the `[data-tour]` target to appear,
// scrolls it into view and draws a dimmed backdrop with a cutout, a cobalt outline and the
// tooltip. On a step with an action, the visitor acts or presses "Do it for me", which
// does it visibly (tourRobot); either way, once the result is on screen the card says what
// changed, the outline moves to it, and the step waits for Next (tourState). Nothing is
// stored: a refresh ends the tour with the demo.

const SEEK_MS = 6000; // a target that hasn't appeared by then: centred, "Skip this step"
const LOST_MS = 1500; // a target gone that long: "This part of the screen has closed."
const SLOW_MS = 400; // a step still opening after this says so
const RESULT_MS = 4000; // an action's result not on screen by then: say "Done" anyway
const SAVED_MS = 4000; // "Do it for me" pressed the button, but nothing saved by then

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const resolve = (value, ctx) =>
  typeof value === "function" ? value(ctx) : value;
const asList = (value) => (Array.isArray(value) ? value : [value]);
const pathnameOf = (path) => path.split("?")[0];

function shown(el) {
  if (!el?.isConnected) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    getComputedStyle(el).visibility !== "hidden"
  );
}

/** The first on-screen element for the first selector that has one. */
function findTarget(selectors) {
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      if (!el.closest("[data-tour-layer]") && shown(el)) return el;
    }
  }
  return null;
}

// Inside something that doesn't scroll with the page: the demo bar, the top bar, the
// sidebar, a sticky rail or action bar, a dialog.
function pinned(el) {
  for (
    let node = el;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const { position } = getComputedStyle(node);
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

// The demo bar's height (AppShell sets --demo-h), 0 on the chooser.
function demoBarHeight() {
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    "--demo-h",
  );
  return Number.parseFloat(value) || 0;
}

// Below the sticky demo bar and top bar.
function safeTop() {
  const bar = document.querySelector('[data-tour="topbar"]');
  return bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
}

/** Brings a target into the open part of a wide screen, below the sticky bars. */
function reveal(el, { behavior }) {
  const rect = el.getBoundingClientRect();
  const top = safeTop() + 8;
  const bottom = window.innerHeight - 8;
  if (rect.top >= top && rect.bottom <= bottom) return;
  if (pinned(el)) {
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior });
    return;
  }
  const room = bottom - top;
  const delta =
    rect.height > room
      ? rect.top - top
      : rect.top - top - (room - rect.height) / 2;
  window.scrollBy({ top: delta, behavior });
}

const sameRect = (a, b) =>
  a &&
  Math.round(a.top) === Math.round(b.top) &&
  Math.round(a.left) === Math.round(b.left) &&
  Math.round(a.width) === Math.round(b.width) &&
  Math.round(a.height) === Math.round(b.height);

export default function TourLayer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { mutateAsync: become } = useDemoSignIn(demo.setPerspective);
  const phone = useMediaQuery("(max-width: 639px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [rect, setRect] = useState(null);
  const [targetKey, setTargetKey] = useState(0); // bumped when the outline moves
  const [tipSize, setTipSize] = useState(null);
  const [sheetSide, setSheetSide] = useState("bottom");
  const [view, setView] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [running, setRunning] = useState(false); // "Do it for me" is working
  const [doError, setDoError] = useState(null);
  const [slow, setSlow] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [layer, setLayer] = useState(null);

  const tipRef = useRef(null);
  const elRef = useRef(null);
  const areaRef = useRef(null); // the part "Do it for me" is changing
  const pinnedRef = useRef(false); // the outlined element doesn't scroll with the page
  const runRef = useRef(0);
  const outcomeRef = useRef(null);
  const extra = useRef({ memo: {}, since: 0 });
  const returnFocus = useRef(null);
  const userRef = useRef(user);
  const pathRef = useRef("");
  // The router's navigate changes with every pathname, so the step reads it from a ref:
  // a page that moves on by itself (a submitted report opens its week) must not restart
  // the step it belongs to.
  const navigateRef = useRef(navigate);
  const becomeRef = useRef(become);
  useEffect(() => {
    userRef.current = user;
    pathRef.current = location.pathname + location.search;
    outcomeRef.current = state.outcome;
    navigateRef.current = navigate;
    becomeRef.current = become;
  });

  const step = STEPS[state.index];
  const on = state.mode === "on";
  const locked = state.outcome === "doing";
  const finished = state.outcome === "done";

  const context = useCallback(
    () => ({
      ...tourContext(demo.store),
      path: pathnameOf(pathRef.current),
      memo: extra.current.memo,
      since: extra.current.since,
    }),
    [],
  );

  // ---------------------------------------------------------------- controls

  // Where focus goes back to when the tour ends: what had it when the tour started —
  // or, when it starts from the panel, whatever opened the panel.
  const panelOpener = useRef(null);
  const start = useCallback((index = 0) => {
    if (!returnFocus.current?.isConnected) {
      const active = document.activeElement;
      returnFocus.current = active?.closest("[data-tour-layer]")
        ? panelOpener.current
        : active;
    }
    runRef.current = 0; // "Do it for me" stops now, not on the next render
    dispatch({ type: "start", index });
  }, []);

  const leave = useCallback((keep) => {
    runRef.current = 0;
    dispatch({ type: "exit", keep });
    const back = returnFocus.current;
    returnFocus.current = null;
    requestAnimationFrame(() => {
      // Gone (a change of person re-renders the shell): the demo bar's Tour button,
      // where the tour opens again, or the page.
      const target = back?.isConnected
        ? back
        : (document.querySelector('[data-tour="tour-launcher"]') ??
          document.getElementById("main"));
      target?.focus({ preventScroll: true });
    });
  }, []);

  const go = (index) => dispatch({ type: "go", index });

  const handleRequest = useCallback(
    (action) => {
      if (action === "start") start(0);
      if (action === "panel") {
        panelOpener.current = document.activeElement;
        dispatch({ type: "panel", open: true });
      }
    },
    [start],
  );
  useEffect(() => onTourRequest(handleRequest), [handleRequest]);
  useEffect(() => {
    const onEvent = (event) => handleRequest(event.detail);
    window.addEventListener(TOUR_EVENT, onEvent);
    return () => window.removeEventListener(TOUR_EVENT, onEvent);
  }, [handleRequest]);

  // ---------------------------------------------------------------- running a step

  useEffect(() => {
    if (state.mode !== "on") return undefined;
    const run = state.run;
    runRef.current = run;
    const alive = () => runRef.current === run;
    const current = STEPS[state.index];
    const slowTimer = setTimeout(() => alive() && setSlow(true), SLOW_MS);

    (async () => {
      elRef.current = null;
      areaRef.current = null;
      setRect(null);
      setSheetSide("bottom");
      setRunning(false);
      setDoError(null);
      if (!current.keepLayers) await closePageLayers();
      if (!alive()) return;
      if (prepare(demo.store, current.prepare)) {
        await queryClient.invalidateQueries();
      }
      if (!alive()) return;
      if (userRef.current?._id !== PERSPECTIVES[current.as]) {
        try {
          await becomeRef.current(current.as);
        } catch {
          // The target won't appear; the step says so and offers to skip.
        }
        if (!alive()) return;
      }
      const ctx = context();
      const route = resolve(current.route, ctx);
      if (pathRef.current !== route) navigateRef.current(route);
      extra.current = {
        memo: current.action?.remember?.(ctx) ?? {},
        since: Date.now(),
      };

      // The router arrives, the page loads its data, the target appears.
      const begun = Date.now();
      let el = null;
      while (alive() && Date.now() - begun < SEEK_MS) {
        if (pathnameOf(pathRef.current) === pathnameOf(route)) {
          el = findTarget(asList(resolve(current.target, context())));
          if (el) break;
        }
        await sleep(100);
      }
      if (!alive()) return;
      clearTimeout(slowTimer);
      setSlow(false);
      if (!el) {
        dispatch({ type: "phase", run, phase: "missing" });
        return;
      }
      elRef.current = el;
      pinnedRef.current = pinned(el);
      dispatch({ type: "phase", run, phase: "shown" });
    })();

    return () => {
      clearTimeout(slowTimer);
      // Left (Next, Back, a jump, Exit): "Do it for me" stops at its next move.
      runRef.current = 0;
    };
  }, [state.mode, state.run, state.index, queryClient, context]);

  // Follow the target every frame while it is shown: it scrolls, it re-renders, a
  // dialog animates in. The outline goes to the first of these on screen: an action's
  // result once it is done; the part "Do it for me" is changing; the step's own target;
  // while an action is under way, its result (the page may have moved on to it). Gone
  // for a while, with no action under way → "lost".
  const settled = ["shown", "missing", "lost"].includes(state.phase);
  useEffect(() => {
    if (!on || state.phase !== "shown") return undefined;
    const run = state.run;
    const selectors = () => {
      const ctx = context();
      const own = asList(resolve(step.target, ctx));
      if (!step.action) return own;
      const result = asList(resolve(step.action.done.target, ctx));
      if (finished) return [...result, ...own];
      const area = areaRef.current ? [areaRef.current] : [];
      return outcomeRef.current === "doing"
        ? [...area, ...own, ...result]
        : [...area, ...own];
    };
    let frame;
    let lostAt = null;
    const tick = () => {
      const el = findTarget(selectors());
      if (el !== elRef.current) {
        elRef.current = el;
        if (el) {
          pinnedRef.current = pinned(el);
          setTargetKey((key) => key + 1);
        }
      }
      if (el) {
        lostAt = null;
        const next = el.getBoundingClientRect();
        setRect((prev) =>
          sameRect(prev, next)
            ? prev
            : {
                top: next.top,
                left: next.left,
                width: next.width,
                height: next.height,
              },
        );
      } else {
        setRect(null);
        lostAt ??= Date.now();
        if (Date.now() - lostAt > LOST_MS && outcomeRef.current === null) {
          dispatch({ type: "phase", run, phase: "lost" });
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on, state.phase, state.run, step, finished, context]);

  // A step with an action: watch for it — the visitor's or "Do it for me"'s. Once it has
  // happened, wait until it has saved and the screen has caught up (nothing fetching or
  // saving, its result on screen), then the card says what changed. The step stays;
  // only Next moves the tour on.
  useEffect(() => {
    const action = step.action;
    if (
      !on ||
      !action ||
      finished ||
      !["shown", "lost"].includes(state.phase)
    ) {
      return undefined;
    }
    const run = state.run;
    let happenedAt = null;
    const timer = setInterval(() => {
      const ctx = context();
      if (happenedAt === null) {
        if (!action.until(ctx)) return;
        happenedAt = Date.now();
        dispatch({ type: "happened", run });
      }
      const onScreen =
        findTarget(asList(resolve(action.done.target, ctx))) &&
        queryClient.isFetching() === 0 &&
        queryClient.isMutating() === 0;
      if (onScreen || Date.now() - happenedAt > RESULT_MS) {
        clearInterval(timer);
        dispatch({ type: "done", run });
      }
    }, 150);
    return () => clearInterval(timer);
  }, [on, step, finished, state.phase, state.run, queryClient, context]);

  // Someone pressed Switch in the demo bar: the tour pauses where it was.
  useEffect(() => {
    if (on && settled && !user) leave(true);
  }, [on, settled, user, leave]);

  // What the card says once the action is done: its title and body may read the store
  // (which day was posted).
  const outcome = finished
    ? {
        title: resolve(step.action.done.title, context()),
        body: resolve(step.action.done.body, context()),
      }
    : null;

  // The tooltip takes focus when its step opens, and when an action's result comes in,
  // unless the visitor is already in it (pressing Next): then the live region reads it.
  useEffect(() => {
    if (!on || !settled) return;
    const tip = tipRef.current;
    if (!tip) return;
    if (tip.contains(document.activeElement)) {
      setAnnouncement(
        outcome
          ? `${outcome.title}. ${outcome.body}`
          : `Step ${state.index + 1} of ${STEPS.length}, ${AUDIENCES[step.audience]}. ${step.title}. ${step.body}`,
      );
    } else {
      setAnnouncement("");
      tip.focus({ preventScroll: true });
    }
    // Once per step, phase and outcome, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, settled, state.run, state.phase, finished]);

  // Esc ends the tour — unless it closed one of the page's own dialogs or menus first.
  useEffect(() => {
    if (!on) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || !event.isTrusted)
        return;
      const open = document.querySelector(
        '[role="dialog"][data-state="open"]:not([data-tour-layer] *), [role="menu"][data-state="open"], [role="listbox"]',
      );
      if (open) return;
      leave(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, leave]);

  useEffect(() => {
    const onResize = () =>
      setView({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The tooltip's size, for placing it; it re-mounts per step.
  const showTip = on && settled && !state.panel;
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!showTip || !tip) return undefined;
    const measure = () =>
      setTipSize((prev) =>
        prev?.width === tip.offsetWidth && prev?.height === tip.offsetHeight
          ? prev
          : { width: tip.offsetWidth, height: tip.offsetHeight },
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tip);
    return () => observer.disconnect();
  }, [showTip, state.run, finished, phone]);

  // Once the tooltip's size is known, and again whenever the outline moves (to the part
  // "Do it for me" is changing, or to an action's result), bring the target into view.
  // On a phone, clear of the sheet, which goes to the bottom unless it would cover the
  // target there. On a
  // wide screen, when the tooltip has no room below the target, scroll the target up so
  // the two sit one above the other: the tooltip then never covers what the visitor is
  // about to use.
  useEffect(() => {
    const el = elRef.current;
    if (state.phase !== "shown" || !tipSize || !el) return;
    const behavior = reduced ? "auto" : "smooth";
    if (phone) {
      const page = document.scrollingElement;
      const plan = planSheet(
        padRect(el.getBoundingClientRect()),
        tipSize.height,
        view,
        {
          safeTop: safeTop(),
          scroll: page.scrollTop,
          maxScroll: page.scrollHeight - page.clientHeight,
          pinned: pinned(el),
          offset: demoBarHeight(),
        },
      );
      setSheetSide(plan.side);
      if (plan.delta !== 0) window.scrollBy({ top: plan.delta, behavior });
      else if (pinned(el)) reveal(el, { behavior });
      return;
    }
    const delta = pinned(el)
      ? null
      : roomBelow(
          padRect(el.getBoundingClientRect()),
          tipSize,
          view,
          safeTop(),
        );
    if (delta == null) reveal(el, { behavior });
    else if (delta !== 0) window.scrollBy({ top: delta, behavior });
    // Once per step, target and size; following the scroll is the frame loop's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, state.run, state.phase, tipSize?.height, targetKey]);

  // A page dialog marks everything outside it aria-hidden; the tour must stay readable.
  useEffect(() => {
    if (!layer) return undefined;
    const clear = () => {
      if (layer.hasAttribute("aria-hidden"))
        layer.removeAttribute("aria-hidden");
    };
    const observer = new MutationObserver(clear);
    observer.observe(layer, {
      attributes: true,
      attributeFilter: ["aria-hidden"],
    });
    return () => observer.disconnect();
  }, [layer]);

  // ---------------------------------------------------------------- doing it for them

  // Visibly, at a pace the visitor can follow (all at once under reduced motion), with
  // the outline on the part being changed. Back, Next and "Do it for me" wait until it is
  // done; Exit doesn't. A second press while it works does nothing.
  const doIt = async () => {
    if (outcomeRef.current !== null || state.phase !== "shown") return;
    outcomeRef.current = "doing";
    const run = state.run;
    const alive = () => runRef.current === run;
    dispatch({ type: "do", run });
    setRunning(true);
    setDoError(null);
    const robot = createRobot({
      alive,
      reduced,
      onArea: (target) => {
        areaRef.current = target;
      },
    });
    try {
      await step.action.doIt(robot, context());
      // The button is pressed; wait for the save itself (the watcher above then waits
      // for the screen).
      const pressed = Date.now();
      while (!step.action.until(context())) {
        if (!alive()) return;
        if (Date.now() - pressed > SAVED_MS) throw new Error("not-saved");
        await sleep(100);
      }
    } catch {
      if (alive()) {
        areaRef.current = null;
        dispatch({ type: "failed", run });
        setDoError("That didn’t work here. Try it yourself, or press Next.");
      }
    } finally {
      if (alive()) setRunning(false);
    }
  };

  // Tab past the tooltip's last control reaches the highlighted element.
  const tabOut = () => {
    const el = elRef.current;
    if (!el) return false;
    const focusable = el.matches(
      "a[href], button, input, select, textarea, [tabindex]",
    )
      ? el
      : el.querySelector(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );
    if (!focusable) return false;
    focusable.focus();
    return true;
  };

  // ---------------------------------------------------------------- drawing

  const highlight =
    state.phase === "shown" && rect
      ? withinView(
          clipToOpenArea(
            clipBelow(padRect(rect), pinnedRef.current ? 0 : safeTop()),
            phone
              ? {
                  side: sheetSide,
                  height: tipSize?.height ?? 0,
                  offset: demoBarHeight(),
                }
              : null,
            view,
          ),
          view,
        )
      : null;
  const placed =
    !phone && showTip && tipSize
      ? placeTooltip(highlight, tipSize, view, step.side, demoBarHeight())
      : null;
  const tipStyle = phone
    ? undefined
    : placed
      ? { top: placed.top, left: placed.left }
      : { top: 0, left: 0, visibility: "hidden" };

  return createPortal(
    <div ref={setLayer} data-tour-layer="">
      {showTip && (
        <svg
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[60]"
          width={view.width}
          height={view.height}
        >
          <path
            fillRule="evenodd"
            style={{ fill: "var(--backdrop)" }}
            d={
              `M0 0H${view.width}V${view.height}H0Z` +
              (highlight
                ? `M${highlight.left} ${highlight.top}h${highlight.width}v${highlight.height}h${-highlight.width}Z`
                : "")
            }
          />
        </svg>
      )}
      {showTip && highlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[61] border-2 border-acc"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}
      {showTip && (
        <TourTooltip
          key={`${state.run}:${finished}`}
          ref={tipRef}
          step={step}
          index={state.index}
          phase={state.phase}
          outcome={outcome}
          locked={locked}
          running={running}
          doError={doError}
          sheet={phone ? sheetSide : null}
          style={tipStyle}
          onBack={() => go(state.index - 1)}
          onNext={() => go(state.index + 1)}
          onDoIt={doIt}
          onExit={() => leave(true)}
          onRetry={() => dispatch({ type: "retry" })}
          onFinish={() => leave(false)}
          onTabOut={tabOut}
        />
      )}
      {on && state.phase === "moving" && slow && !state.panel && (
        <div
          role="status"
          className="pointer-events-auto fixed bottom-20 left-1/2 z-[62] flex -translate-x-1/2 items-center gap-11 border border-hair2 bg-card py-6 pr-6 pl-16 text-dense text-body shadow-[var(--shadow-pop)]"
        >
          Opening the next step…
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Exit the tour"
            onClick={() => leave(true)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {layer && (
        <TourPanel
          open={state.panel}
          onOpenChange={(open) => dispatch({ type: "panel", open })}
          container={layer}
          active={on}
          current={state.index}
          resume={state.resume}
          visited={state.visited}
          onJump={(index) => start(index)}
          onResume={() => start(state.resume)}
          onRestart={() => start(0)}
          onEnd={() => leave(false)}
        />
      )}
    </div>,
    document.body,
  );
}
