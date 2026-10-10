import { useLayoutEffect } from "react";

// The landing page's motion (frontend_architecture.md §9.16), first ported from the inline
// scripts of landing-reference/index.html: reveals, split headings, counters, SVG drawing
// and the hero's typed blocker that crosses the desk. The landing revamp (owner decision)
// added the two guided scroll stories — the team member's week and the manager's
// dashboard — which pin, type one caption per step and draw a line to what it explains.
// It works on the DOM under the `.landing` root.
//
// Scrolling never reads layout: each story measures its geometry once (on mount, resize
// and when the fonts arrive) and every scroll frame only writes `transform`, `opacity`
// and SVG attributes from those numbers.
//
// Every effect has a static path. Under `prefers-reduced-motion` the root never gets
// `.motion`, so nothing starts hidden and nothing travels; what stays is what is not
// motion (the stage fitting its column, the filter buttons, the header's state).
// The effect cleans up everything it adds, so it is safe to mount twice (StrictMode).

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const out3 = (t) => 1 - Math.pow(1 - t, 3);
const io3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const decimals = (v) => (String(v).split(".")[1] || "").length;

// One story's guide: the caption column (typed, one step at a time) and the SVG overlay
// (a line from the caption to its target, an arrowhead, a ring around the target and,
// for the dashboard, a dim over the rest). Every write is skipped when nothing changed.
function createGuide(svg, capsRoot) {
  const caps = [...capsRoot.querySelectorAll(".cap")];
  const typedEls = caps.map((c) => c.querySelector(".cap-ty"));
  const texts = caps.map((c) => c.querySelector(".cap-full").textContent);
  const num = capsRoot.querySelector(".sprog-n b");
  const bars = [...capsRoot.querySelectorAll(".sprog-bar i")];
  const part = (cls) => svg.querySelector(cls);
  const dim = part(".g-dim");
  const halo = part(".g-halo");
  const ln = part(".g-ln");
  const hd = part(".g-hd");
  const ring = part(".g-ring");
  [halo, ln].forEach((p) => p.setAttribute("pathLength", "1"));
  let cur = -1;
  let armed = false;
  let typeTimer = 0;
  let shown = false;
  const last = new Map();
  const set = (el, name, value) => {
    const key = el;
    const prev = last.get(key) || {};
    if (prev[name] === value) return;
    prev[name] = value;
    last.set(key, prev);
    if (name === "opacity" || name === "strokeDashoffset")
      el.style[name] = value;
    else el.setAttribute(name, value);
  };

  const stopTyping = () => clearInterval(typeTimer);
  const type = (i) => {
    stopTyping();
    // the caption that is leaving keeps its words while it fades
    caps.forEach((c, j) => {
      if (j !== i) c.classList.remove("typing");
    });
    const el = typedEls[i];
    const text = texts[i];
    let n = 0;
    el.textContent = "";
    caps[i].classList.add("typing");
    // the whole sentence in well under a second, however long it is
    const per = Math.max(12, Math.min(30, 760 / text.length));
    typeTimer = setInterval(() => {
      n += 1;
      el.textContent = text.slice(0, n);
      if (n >= text.length) {
        stopTyping();
        caps[i].classList.remove("typing");
      }
    }, per);
  };
  const setStep = (i) => {
    if (i === cur) return;
    cur = i;
    caps.forEach((c, j) => c.classList.toggle("on", j === i));
    if (num) num.textContent = String(i + 1);
    bars.forEach((b, j) => b.classList.toggle("on", j <= i));
    if (armed) type(i);
  };
  const arm = () => {
    if (armed) return;
    armed = true;
    if (cur >= 0) type(cur);
  };

  const hide = () => {
    if (!shown) return;
    shown = false;
    [dim, halo, ln, hd, ring].forEach((el) => el && set(el, "opacity", "0"));
  };
  // o: where the line starts; r: the target's box; a: 0→1 how far it is drawn;
  // anchor: the side of the target the line arrives on; box: the area the dim covers.
  const draw = (o, r, a, anchor, box) => {
    if (!r || a <= 0) {
      hide();
      return;
    }
    shown = true;
    const f = (v) => v.toFixed(1);
    let e;
    let c1;
    let c2;
    let head;
    let path;
    if (anchor === "top" && r.lane !== undefined && r.top < o[1]) {
      // up the lane beside the card, along the gap over it, then down onto the target
      e = [r.x + r.w / 2, r.y - 10];
      const wy = r.top - 14;
      path =
        `M${f(o[0])} ${f(o[1])}C${f(r.lane)} ${f(o[1])} ${f(r.lane)} ${f(wy)} ${f(r.lane + 40)} ${f(wy)}` +
        `L${f(e[0] - 14)} ${f(wy)}Q${f(e[0])} ${f(wy)} ${f(e[0])} ${f(wy + 14)}L${f(e[0])} ${f(e[1])}`;
      head = `M${f(e[0] - 6)} ${f(e[1] - 8)}L${f(e[0])} ${f(e[1])}L${f(e[0] + 6)} ${f(e[1] - 8)}`;
    } else if (anchor === "top") {
      e = [r.x + r.w / 2, r.y - 12];
      const dy = e[1] - o[1];
      c1 = [o[0], o[1] + dy * 0.55];
      c2 = [e[0], e[1] - Math.max(40, Math.abs(dy) * 0.45)];
      head = `M${f(e[0] - 6)} ${f(e[1] - 8)}L${f(e[0])} ${f(e[1])}L${f(e[0] + 6)} ${f(e[1] - 8)}`;
    } else {
      e = [r.x - 12, r.y + r.h / 2];
      const dx = e[0] - o[0];
      c1 = [o[0] + dx * 0.5, o[1]];
      c2 = [e[0] - Math.max(30, dx * 0.5), e[1]];
      head = `M${f(e[0] - 8)} ${f(e[1] - 6)}L${f(e[0])} ${f(e[1])}L${f(e[0] - 8)} ${f(e[1] + 6)}`;
    }
    if (!path)
      path = `M${f(o[0])} ${f(o[1])}C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(e[0])} ${f(e[1])}`;
    const off = (1 - a).toFixed(3);
    [halo, ln].forEach((p) => {
      set(p, "d", path);
      set(p, "strokeDashoffset", off);
      set(p, "opacity", "1");
    });
    set(hd, "d", head);
    set(hd, "opacity", a >= 0.97 ? "1" : "0");
    const pad = 6;
    const rx = r.x - pad;
    const ry = r.y - pad;
    const rw = r.w + pad * 2;
    const rh = r.h + pad * 2;
    set(ring, "x", f(rx));
    set(ring, "y", f(ry));
    set(ring, "width", f(rw));
    set(ring, "height", f(rh));
    set(ring, "opacity", "1");
    if (dim && box) {
      set(
        dim,
        "d",
        `M${f(box.x)} ${f(box.y)}h${f(box.w)}v${f(box.h)}h${f(-box.w)}Z` +
          `M${f(rx)} ${f(ry)}v${f(rh)}h${f(rw)}v${f(-rh)}Z`,
      );
      set(dim, "opacity", "1");
    }
  };
  const size = (wd, ht) => {
    set(svg, "viewBox", `0 0 ${Math.round(wd)} ${Math.round(ht)}`);
    set(svg, "width", String(Math.round(wd)));
    set(svg, "height", String(Math.round(ht)));
  };
  const reset = () => {
    stopTyping();
    cur = -1;
    armed = false;
    hide();
    last.clear();
    caps.forEach((c, j) => {
      c.classList.remove("on", "typing");
      typedEls[j].textContent = "";
    });
    bars.forEach((b) => b.classList.remove("on"));
    if (num) num.textContent = "1";
    [dim, halo, ln, hd, ring].forEach((el) => el && (el.style.opacity = ""));
    [halo, ln].forEach((p) => (p.style.strokeDashoffset = ""));
  };
  return { setStep, arm, draw, hide, size, reset };
}

// A box relative to another (both from getBoundingClientRect).
const rel = (r, to) => ({
  x: r.left - to.left,
  y: r.top - to.top,
  w: r.width,
  h: r.height,
});
const smooth = (t) => t * t * (3 - 2 * t);
const span = (u, a, b) => smooth(clamp((u - a) / (b - a)));
// Piecewise path through [u, value] keys, eased within each piece.
const keyed = (keys, u) => {
  for (let i = 1; i < keys.length; i += 1) {
    if (u <= keys[i][0]) {
      const [u0, v0] = keys[i - 1];
      const [u1, v1] = keys[i];
      return v0 + (v1 - v0) * span(u, u0, u1);
    }
  }
  return keys[keys.length - 1][1];
};

export function useLandingMotion(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const w = window;
    const d = document;
    const motion = !w.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = w.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const $$ = (selector, scope = root) => [
      ...scope.querySelectorAll(selector),
    ];
    const $ = (selector) => root.querySelector(selector);

    // Everything the effect starts, undone together.
    const undo = [];
    const listen = (target, type, fn, options) => {
      target.addEventListener(type, fn, options);
      undo.push(() => target.removeEventListener(type, fn, options));
    };
    const observe = (options, callback, targets) => {
      const observer = new IntersectionObserver(callback, options);
      targets.forEach((t) => observer.observe(t));
      undo.push(() => observer.disconnect());
      return observer;
    };
    const timers = new Set();
    const later = (ms, fn) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };
    undo.push(() => {
      timers.forEach(clearTimeout);
      timers.clear();
    });

    let alive = true;
    undo.push(() => {
      alive = false;
    });

    root.classList.add("js");
    if (motion) root.classList.add("motion");

    /* ── Reveal on view: [data-reveal], split headings, SVG drawing, counters ── */
    const countUp = (el) => {
      const to = parseFloat(el.dataset.count);
      const dec = decimals(el.dataset.count);
      const dur = +(el.dataset.dur || 1200);
      const from = parseFloat(el.dataset.from || 0);
      let t0 = null;
      let frame = 0;
      const step = (t) => {
        if (!t0) t0 = t;
        const k = Math.min((t - t0) / dur, 1);
        const e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
        el.textContent = (from + (to - from) * e).toFixed(dec);
        if (k < 1) frame = requestAnimationFrame(step);
        else el.textContent = el.dataset.count;
      };
      frame = requestAnimationFrame(step);
      undo.push(() => cancelAnimationFrame(frame));
    };

    const targets = $$(
      "[data-reveal],[data-split],[data-draw],[data-count],[data-in],[data-grow]",
    );
    if (!motion || !("IntersectionObserver" in w)) {
      targets.forEach((e) => e.classList.add("in"));
    } else {
      $$("[data-count]").forEach((e) => {
        e.textContent = parseFloat(e.dataset.from || 0).toFixed(
          decimals(e.dataset.count),
        );
      });
      const io = observe(
        { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const t = e.target;
            io.unobserve(t);
            t.classList.add("in");
            if (t.dataset.count !== undefined) countUp(t);
          });
        },
        targets,
      );
      undo.push(() => {
        targets.forEach((e) => e.classList.remove("in"));
        $$("[data-count]").forEach((e) => {
          e.textContent = e.dataset.count;
        });
      });
    }

    /* ── Scroll scenes: --l-p runs 0→1. "pin" measures a tall wrapper with a sticky
          child; "pass" measures the element crossing the viewport. ── */
    const scenes = $$("[data-scene]");
    const active = [];
    let ticking = false;
    const progress = (el) => {
      const r = el.getBoundingClientRect();
      const vh = w.innerHeight;
      const p =
        el.dataset.scene === "pin"
          ? -r.top / Math.max(1, r.height - vh)
          : (vh - r.top) / (vh + r.height);
      return clamp(p);
    };
    const apply = (el, p) => {
      if (el._p === p) return;
      el._p = p;
      el.style.setProperty("--l-p", p.toFixed(4));
      if (el._onp) el._onp(p);
    };
    const measureScenes = () => {
      ticking = false;
      // all reads first, then all writes, so no frame forces a second layout
      const ps = active.map(progress);
      active.forEach((el, i) => apply(el, ps[i]));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measureScenes);
      }
    };
    const onScene = (el, fn) => {
      el._onp = fn;
      fn(motion ? (el._p == null ? progress(el) : el._p) : 1);
    };
    if (motion && scenes.length && "IntersectionObserver" in w) {
      observe(
        { rootMargin: "20% 0px 20% 0px" },
        (entries) => {
          entries.forEach((e) => {
            const i = active.indexOf(e.target);
            if (e.isIntersecting) {
              if (i < 0) active.push(e.target);
            } else {
              apply(e.target, progress(e.target));
              if (i >= 0) active.splice(i, 1);
            }
          });
          onScroll();
        },
        scenes,
      );
      listen(w, "scroll", onScroll, { passive: true });
      listen(w, "resize", onScroll);
    } else {
      scenes.forEach((s) => {
        s.style.setProperty("--l-p", 1);
        s._p = 1;
      });
    }
    undo.push(() =>
      scenes.forEach((s) => {
        s._onp = null;
        s._p = null;
        s.style.removeProperty("--l-p");
      }),
    );

    /* ── Header state and reading rail ── */
    const header = $("[data-header]");
    const rail = $("[data-rail]");
    let railTick = false;
    let docH = 0;
    const measureDoc = () => {
      docH = d.documentElement.scrollHeight - w.innerHeight;
    };
    const chrome = () => {
      railTick = false;
      if (header) header.classList.toggle("scrolled", w.scrollY > 12);
      if (rail) {
        rail.style.transform = `scaleX(${(docH > 0 ? Math.min(1, w.scrollY / docH) : 0).toFixed(4)})`;
      }
    };
    measureDoc();
    if ("ResizeObserver" in w) {
      const ro = new ResizeObserver(() => {
        measureDoc();
        chrome();
      });
      ro.observe(root);
      undo.push(() => ro.disconnect());
    }
    listen(
      w,
      "scroll",
      () => {
        if (!railTick) {
          railTick = true;
          requestAnimationFrame(chrome);
        }
      },
      { passive: true },
    );
    chrome();

    /* ── Micro-interactions for a fine pointer only ── */
    if (motion && fine) {
      $$("[data-magnetic]").forEach((el) => {
        const s = +(el.dataset.magnetic || 0.25);
        listen(el, "pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const x = e.clientX - r.left - r.width / 2;
          const y = e.clientY - r.top - r.height / 2;
          el.style.transform = `translate3d(${(x * s).toFixed(1)}px,${(y * s * 1.2).toFixed(1)}px,0)`;
        });
        listen(el, "pointerleave", () => {
          el.style.transform = "";
        });
      });
      $$("[data-tilt]").forEach((el) => {
        const m = +(el.dataset.tilt || 5);
        listen(el, "pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(1100px) rotateX(${(-y * m).toFixed(2)}deg) rotateY(${(x * m).toFixed(2)}deg)`;
        });
        listen(el, "pointerleave", () => {
          el.style.transform = "";
        });
      });
    }

    /* ── Hero: fit the desk stage to its column ── */
    const comp = $("#comp");
    const stage = $("#stage");
    const narrow = w.matchMedia("(max-width: 639px)");
    const dims = () => (narrow.matches ? [400, 650] : [792, 584]);
    const fit = () => {
      const D = dims();
      const k = Math.min(1, comp.clientWidth / D[0]);
      stage.style.setProperty("--l-k", k.toFixed(4));
      comp.style.setProperty("--l-ch", `${Math.round(D[1] * k)}px`);
    };
    fit();
    listen(w, "resize", fit);

    /* ── Hero: the blocker is typed, posted, and crosses the desk ── */
    const TEXT = "Waiting on API keys from the client";
    const typed = $("#typed");
    const bf = $("#bf");
    const post = $("#post");
    const fly = $("#fly");
    const trail = $("#trail");
    const ln = $("#ln");
    const halo = $("#halo");
    const target = $("#m-blk");
    const cell = $("#mc-blk");
    const row = $("#r-imali");
    const rHrs = $("#r-hrs");
    const replay = $("#replay");
    let heroTimers = [];
    let heroFrame = 0;
    const heroLater = (ms, fn) => heroTimers.push(later(ms, fn));
    const halt = () => {
      heroTimers.forEach(clearTimeout);
      heroTimers = [];
      cancelAnimationFrame(heroFrame);
    };
    const count = (el, from, to, dur, dec) => {
      let t0 = null;
      const step = (t) => {
        if (!t0) t0 = t;
        const k = Math.min((t - t0) / dur, 1);
        el.textContent = (from + (to - from) * out3(k)).toFixed(dec);
        if (k < 1) heroFrame = requestAnimationFrame(step);
      };
      heroFrame = requestAnimationFrame(step);
    };
    const initial = () => {
      stage.classList.remove("sent", "landed");
      row.classList.remove("hi");
      cell.classList.remove("flash");
      post.classList.remove("press");
      bf.classList.remove("filled", "typing");
      typed.textContent = "";
      rHrs.textContent = "7.5";
      fly.style.opacity = 0;
      trail.style.transition = "none";
      trail.style.opacity = 0;
    };
    const land = () => {
      stage.classList.add("landed");
      cell.classList.add("flash");
      row.classList.add("hi");
      count(rHrs, 7.5, 14.5, 900, 1);
      heroLater(500, () => {
        trail.style.transition = "opacity .7s linear";
        trail.style.opacity = 0;
      });
      heroLater(1000, () => cell.classList.remove("flash"));
      heroLater(1700, () => row.classList.remove("hi"));
    };
    const travel = () => {
      const D = dims();
      const s = stage.getBoundingClientRect();
      const k = s.width / D[0];
      const pt = (el, fx, fy) => {
        const r = el.getBoundingClientRect();
        return [
          (r.left + r.width * fx - s.left) / k,
          (r.top + r.height * fy - s.top) / k,
        ];
      };
      /* leave the phone sideways, then rise into the metric from below */
      const a = pt(post, 1, 0.5);
      const b = pt(target, 0.5, 0.6);
      const dy = a[1] - b[1];
      const path =
        `M${a[0].toFixed(1)} ${a[1].toFixed(1)}` +
        ` C${(a[0] + Math.max(140, (b[0] - a[0]) * 0.9)).toFixed(1)} ${(a[1] + 12).toFixed(1)}` +
        ` ${(b[0] + 16).toFixed(1)} ${(b[1] + dy * 0.62).toFixed(1)}` +
        ` ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      trail.setAttribute("viewBox", `0 0 ${D[0]} ${D[1]}`);
      ln.setAttribute("d", path);
      halo.setAttribute("d", path);
      const L = ln.getTotalLength();
      [ln, halo].forEach((p) => {
        p.style.strokeDasharray = L;
        p.style.strokeDashoffset = L;
      });
      trail.style.transition = "none";
      trail.style.opacity = 1;
      const fw = fly.offsetWidth;
      const fh = fly.offsetHeight;
      let t0 = null;
      const dur = 1000;
      const step = (ts) => {
        if (!t0) t0 = ts;
        const t = Math.min((ts - t0) / dur, 1);
        const e = io3(t);
        const p = ln.getPointAtLength(e * L);
        const sc =
          e < 0.45
            ? 0.7 + 0.36 * out3(e / 0.45)
            : 1.06 - (0.46 * (e - 0.45)) / 0.55;
        fly.style.transform = `translate3d(${(p.x - fw / 2).toFixed(1)}px,${(p.y - fh / 2).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
        fly.style.opacity =
          t < 0.1 ? t / 0.1 : t > 0.86 ? Math.max(0, (1 - t) / 0.14) : 1;
        const off = (L * (1 - e)).toFixed(1);
        ln.style.strokeDashoffset = off;
        halo.style.strokeDashoffset = off;
        if (t < 1) heroFrame = requestAnimationFrame(step);
        else land();
      };
      heroFrame = requestAnimationFrame(step);
    };
    const play = () => {
      halt();
      initial();
      let t = 650;
      const stepMs = 36;
      heroLater(t, () => bf.classList.add("typing"));
      for (let i = 1; i <= TEXT.length; i += 1) {
        heroLater(t + 220 + i * stepMs, () => {
          typed.textContent = TEXT.slice(0, i);
          if (i === 1) bf.classList.add("filled");
        });
      }
      t += 220 + TEXT.length * stepMs + 300;
      heroLater(t, () => {
        bf.classList.remove("typing");
        post.classList.add("press");
      });
      heroLater(t + 170, () => {
        post.classList.remove("press");
        stage.classList.add("sent");
      });
      heroLater(t + 260, travel);
    };
    if (motion) {
      initial();
      let started = false;
      const hio = observe(
        { threshold: 0.4 },
        (entries) => {
          if (entries[0].isIntersecting && !started) {
            started = true;
            hio.disconnect();
            play();
          }
        },
        [comp],
      );
      listen(replay, "click", play);
      listen(narrow, "change", () => {
        halt();
        initial();
        stage.classList.add("sent", "landed");
        bf.classList.add("filled");
        typed.textContent = TEXT;
        rHrs.textContent = "14.5";
      });
      undo.push(() => {
        halt();
        // Back to the state the markup holds: sent, landed, typed.
        stage.classList.add("sent", "landed");
        bf.classList.add("filled");
        bf.classList.remove("typing");
        typed.textContent = TEXT;
        rHrs.textContent = "14.5";
        fly.style.opacity = "";
        trail.style.opacity = "";
        trail.style.transition = "";
      });
    }

    /* ── Pinned stories: only with motion on a wide screen. Phones and reduced motion
          get the stacked layout (captions above the mock-ups), which is the markup's own. ── */
    const wide = w.matchMedia("(min-width: 1000px)");
    const pinOn = () => motion && wide.matches;
    // Each story's captions start typing the first time they come into view.
    const armWhenSeen = (el, g) => {
      if (!("IntersectionObserver" in w)) {
        g.arm();
        return;
      }
      const io = observe(
        { threshold: 0.6 },
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            g.arm();
          }
        },
        [el],
      );
    };
    const targetsOf = (scope) => {
      const byStep = new Map();
      $$("[data-t]", scope).forEach((el) => byStep.set(+el.dataset.t, el));
      return byStep;
    };

    /* ── The team member's week: eight steps, Monday to Friday, then the report ── */
    const wk = $("#week");
    const wkSticky = $("#week .wk-sticky");
    const track = $("#track");
    const days = $$("#track .day");
    const report = $("#report");
    const wst = $("#wk-stage");
    const fill = $("#dayfill");
    const dayLabels = $$("#dayrail li");
    const sels = $$("#report .st");
    const ind = $("#dr-ind");
    const drRep = $("#week .dr-rep");
    const wkCaps = $("#week .story-caps");
    const wkGuide = createGuide($("#wk-guide"), wkCaps);
    const wkTargets = targetsOf(wk);
    const WK_N = 8;
    // where the line starts drawing within each step (after the cards have settled)
    const WK_DRAW = [0.12, 0.12, 0.12, 0.45, 0.12, 0.15, 0.74, 0.12];
    const WK_IDX = [
      [0, 0],
      [3, 0],
      [3.4, 1],
      [5.1, 1],
      [5.8, 4],
      [WK_N, 4],
    ];
    let wg = null;
    const wkStatic = () => {
      track.style.transform = "";
      report.style.transform = "";
      report.classList.remove("done");
      days.forEach((c) => {
        c.style.transform = "";
        c.style.opacity = "";
        c.style.zIndex = "";
        c.classList.remove("on");
      });
      sels.forEach((s) => s.classList.add("set"));
      wkGuide.reset();
    };
    const wkRender = (p) => {
      if (!wg) return;
      const u = clamp(p) * WK_N;
      const idx = keyed(WK_IDX, u);
      const tx = wg.sc - (wg.base[0].x + idx * wg.step + wg.cw / 2);
      const e1 = span(u, 6, 6.35); // gather into a stack
      const e2 = span(u, 6.2, 6.7); // the report rises
      track.style.transform = `translate3d(${tx.toFixed(1)}px,0,0)`;
      const on = Math.min(4, Math.round(idx));
      const settled = Math.abs(idx - on) < 0.08;
      const shift = [];
      days.forEach((c, i) => {
        const dd = i - idx;
        const ad = Math.min(Math.abs(dd), 1);
        const ty = 12 * ad;
        const rot = Math.max(-1, Math.min(1, dd)) * 2 * ad;
        const sc = 1 - 0.06 * ad;
        const op = 1 - 0.5 * ad;
        const cx = wg.base[i].x + tx + wg.cw / 2;
        const gx = (wg.sc - cx) * e1;
        const gy = ((i - 4) * 12 - 24) * e1;
        const e4 = smooth(clamp(((u - 6.45) / 0.45) * 1.6 - (4 - i) * 0.14));
        const drop = (70 + (4 - i) * 12) * e4;
        const k = (sc * (1 - e1) + (1 - (4 - i) * 0.03) * e1) * (1 - 0.16 * e4);
        const r = (rot * (1 - e1) + (i - 2) * 1.4 * e1) * (1 - e4);
        const dy = ty * (1 - e1) + gy + drop;
        shift[i] = [gx, dy];
        c.style.transform = `translate3d(${gx.toFixed(1)}px,${dy.toFixed(1)}px,0) rotate(${r.toFixed(2)}deg) scale(${k.toFixed(4)})`;
        c.style.zIndex = String(i + 1);
        c.style.opacity = e4 >= 1 ? "0" : (op * (1 - e1) + e1).toFixed(3);
        c.classList.toggle("seen", idx > i - 0.5 || e1 > 0);
        c.classList.toggle("on", i === on && settled && e1 < 0.02);
      });
      const ry = (1 - e2) * (wg.vh / 2 + wg.rh / 2 + 60);
      report.style.transform = `translate3d(-50%,-50%,0) translate3d(0,${ry.toFixed(1)}px,0)`;
      const past = u >= 6.6;
      fill.style.transform = `scaleX(${span(u, 5.8, 6.6).toFixed(4)})`;
      ind.style.transform = `translate3d(${(idx * 56).toFixed(1)}px,0,0)`;
      ind.style.opacity = past ? "0" : "1";
      dayLabels.forEach((l, i) => l.classList.toggle("on", i === on && !past));
      drRep.classList.toggle("on", past);
      const e3 = clamp((u - 7.05) / 0.6);
      sels.forEach((s, i) => s.classList.toggle("set", e3 >= (i + 1) / 4));
      report.classList.toggle("done", e3 >= 1);

      // the caption and its line
      const step = Math.min(WK_N - 1, Math.floor(u));
      wkGuide.setStep(step);
      const t = wg.targets[step];
      const a = clamp((u - step - WK_DRAW[step]) / 0.26);
      let r = null;
      if (t) {
        if (t.owner === "report") r = { ...t, y: t.y + ry };
        else if (t.owner >= 0)
          r = {
            ...t,
            x: t.x + tx + shift[t.owner][0],
            y: t.y + shift[t.owner][1],
            // a line that has to reach the top of a card goes round its left edge
            lane: wg.base[t.owner].x + tx + shift[t.owner][0] - 26,
            top: wg.base[t.owner].y + shift[t.owner][1],
          };
        else r = t;
      }
      wkGuide.draw(wg.origin, r, a, t?.anchor);
    };
    const wkMeasure = () => {
      const on = pinOn();
      wk.classList.toggle("pin", on);
      if (!on) {
        wg = null;
        wkStatic();
        return;
      }
      track.style.transform = "";
      days.forEach((c) => {
        c.style.transform = "";
      });
      report.style.transform = "translate3d(-50%,-50%,0)";
      // read every box at rest: no day's lines mid-slide, no transition running
      wk.classList.add("measuring");
      const S = wkSticky.getBoundingClientRect();
      const stage = rel(wst.getBoundingClientRect(), S);
      const base = days.map((c) => rel(c.getBoundingClientRect(), S));
      const rep = rel(report.getBoundingClientRect(), S);
      const capsBox = rel(wkCaps.getBoundingClientRect(), S);
      const targets = [];
      wkTargets.forEach((el, n) => {
        const b = rel(el.getBoundingClientRect(), S);
        const card = el.closest(".day");
        const owner = card
          ? days.indexOf(card)
          : el.closest("#report")
            ? "report"
            : -1;
        // a card's box is measured where it stands untransformed; the report's at rest
        targets[n] = { ...b, owner, anchor: el.dataset.anchor || "left" };
      });
      wk.classList.remove("measuring");
      wg = {
        sc: stage.x + stage.w / 2,
        vh: stage.h,
        cw: base[0].w,
        step: base[1].x - base[0].x,
        base,
        rh: rep.h,
        targets,
        origin: [capsBox.x + capsBox.w + 14, capsBox.y + 14],
      };
      wkGuide.size(S.width, S.height);
      wkRender(wk._p || 0);
    };
    if (motion) armWhenSeen(wkCaps, wkGuide);
    wkMeasure();
    onScene(wk, (p) => {
      if (wg) wkRender(p);
    });
    listen(w, "resize", wkMeasure);
    listen(wide, "change", wkMeasure);
    if (d.fonts && d.fonts.ready)
      d.fonts.ready.then(() => {
        if (alive) wkMeasure();
      });
    undo.push(() => {
      wk.classList.remove("pin");
      wg = null;
      wkStatic();
      days.forEach((c) => c.classList.remove("seen"));
      sels.forEach((s) => s.classList.remove("set"));
    });

    /* ── Manager view: filters with a FLIP transition and a live count ── */
    const filterButtons = $$("#desk .fbtn");
    const rows = $$("#mt tbody tr");
    const fcount = $("#fcount");
    let filterTimer = 0;
    const label = {
      corr: "needs correction",
      none: "not started",
      blk: "has a blocker",
    };
    const hit = (tr, f) =>
      f === "all" || ` ${tr.dataset.f} `.indexOf(` ${f} `) > -1;
    const filter = (f) => {
      clearTimeout(filterTimer);
      filterButtons.forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.f === f ? "true" : "false"),
      );
      const n = rows.filter((tr) => hit(tr, f)).length;
      fcount.textContent =
        f === "all"
          ? `Showing all ${rows.length} people`
          : `Showing ${n} of ${rows.length}: ${label[f]}`;
      if (!motion) {
        rows.forEach((tr) => {
          tr.hidden = !hit(tr, f);
        });
        return;
      }
      const leaving = rows.filter((tr) => !tr.hidden && !hit(tr, f));
      leaving.forEach((tr) => tr.classList.add("leaving"));
      filterTimer = later(leaving.length ? 200 : 0, () => {
        const first = rows.map((tr) =>
          tr.hidden ? null : tr.getBoundingClientRect().top,
        );
        rows.forEach((tr) => {
          tr.classList.remove("leaving");
          tr.hidden = !hit(tr, f);
        });
        rows.forEach((tr, i) => {
          if (tr.hidden) return;
          tr.style.transition = "none";
          if (first[i] === null) {
            tr.style.opacity = 0;
            tr.style.transform = "translate3d(0,10px,0)";
          } else {
            const dy = first[i] - tr.getBoundingClientRect().top;
            if (dy) tr.style.transform = `translate3d(0,${dy.toFixed(1)}px,0)`;
          }
        });
        void d.body.offsetHeight;
        rows.forEach((tr) => {
          tr.style.transition = "";
          tr.style.transform = "";
          tr.style.opacity = "";
        });
      });
    };
    filterButtons.forEach((b) => listen(b, "click", () => filter(b.dataset.f)));

    /* squares fill day by day, row by row */
    rows.forEach((tr, r) => {
      $$(".ups i", tr).forEach((i, c) => {
        i.style.setProperty("--l-c", c);
        i.style.setProperty("--l-r", r);
      });
    });
    /* the table keeps the height of all its rows whatever the filter, so the dashboard never jumps */
    const mscroll = $("#desk .mscroll");
    const mt = $("#mt");
    const lockHeight = () => {
      const hidden = rows.filter((tr) => tr.hidden);
      hidden.forEach((tr) => {
        tr.hidden = false;
      });
      mscroll.style.minHeight = "";
      mscroll.style.minHeight = `${mt.offsetHeight}px`;
      hidden.forEach((tr) => {
        tr.hidden = true;
      });
    };
    lockHeight();
    listen(w, "resize", lockHeight);

    /* ── The manager's side: ten steps over the dashboard, which is scaled to fit ── */
    const desk = $("#desk");
    const dkSticky = $("#desk .dk-sticky");
    const monitor = $("#monwrap");
    const screenEl = $("#desk .min");
    const dkCaps = $("#desk .story-caps");
    const dkGuide = createGuide($("#dk-guide"), dkCaps);
    const dkTargets = targetsOf(desk);
    const dkEnd = new Map(
      $$("[data-t-end]", desk).map((el) => [+el.dataset.tEnd, el]),
    );
    // the filter each step shows (storySteps.js, carried on the captions)
    const DK_F = $$("#desk .cap").map((c) => c.dataset.f || "all");
    const DK_N = DK_F.length;
    let dg = null;
    let dkFilter = "all";
    const dkStatic = () => {
      monitor.style.transform = "";
      dkGuide.reset();
    };
    const dkRender = (p) => {
      if (!dg) return;
      const u = clamp(p) * DK_N;
      const step = Math.min(DK_N - 1, Math.floor(u));
      dkGuide.setStep(step);
      if (DK_F[step] !== dkFilter) {
        dkFilter = DK_F[step];
        filter(dkFilter);
      }
      const a = clamp((u - step - 0.12) / 0.26);
      const t = dg.targets[step];
      dkGuide.draw(dg.origin, t, a, "top", dg.box);
    };
    const dkMeasure = () => {
      const on = pinOn();
      desk.classList.toggle("pin", on);
      if (!on) {
        dg = null;
        dkStatic();
        return;
      }
      monitor.style.transform = "";
      const S = dkSticky.getBoundingClientRect();
      const M = rel(monitor.getBoundingClientRect(), S);
      const capsBox = rel(dkCaps.getBoundingClientRect(), S);
      // the dashboard keeps its design width (landing.css) and is scaled to the room it has
      const box = monitor.parentElement;
      const pad = getComputedStyle(box);
      const roomW =
        box.clientWidth -
        parseFloat(pad.paddingLeft) -
        parseFloat(pad.paddingRight);
      const k = Math.min(1, (S.height - M.y - 20) / M.h, roomW / M.w);
      const cx = M.x + M.w / 2;
      // a point on the unscaled dashboard, where it shows once scaled from its top centre
      const map = (b) => ({
        x: cx + (b.x - cx) * k,
        y: M.y + (b.y - M.y) * k,
        w: b.w * k,
        h: b.h * k,
      });
      const targets = [];
      dkTargets.forEach((el, n) => {
        let b = rel(el.getBoundingClientRect(), S);
        const end = dkEnd.get(n);
        if (end) {
          const e = rel(end.getBoundingClientRect(), S);
          b = {
            x: b.x,
            y: b.y,
            w: Math.max(b.w, e.x + e.w - b.x),
            h: e.y + e.h - b.y,
          };
        }
        targets[n] = map(b);
      });
      dg = {
        targets,
        box: map(rel(screenEl.getBoundingClientRect(), S)),
        origin: [capsBox.x + 10, capsBox.y + capsBox.h + 8],
      };
      monitor.style.transform = k < 1 ? `scale(${k.toFixed(4)})` : "";
      dkGuide.size(S.width, S.height);
      dkRender(desk._p || 0);
    };
    if (motion) armWhenSeen(dkCaps, dkGuide);
    dkMeasure();
    onScene(desk, (p) => {
      if (dg) dkRender(p);
    });
    listen(w, "resize", dkMeasure);
    listen(wide, "change", dkMeasure);
    if (d.fonts && d.fonts.ready)
      d.fonts.ready.then(() => {
        if (alive) {
          lockHeight();
          dkMeasure();
        }
      });
    undo.push(() => {
      desk.classList.remove("pin");
      dg = null;
      dkStatic();
    });

    /* ── Scroll regions get a tab stop only when they really overflow ── */
    const scrolls = () =>
      $$(".mscroll").forEach((r) => {
        if (r.scrollWidth > r.clientWidth + 1) r.tabIndex = 0;
        else r.removeAttribute("tabindex");
      });
    scrolls();
    listen(w, "resize", scrolls);

    root.classList.add("ready");
    return () => {
      // Undo in reverse, so what was added last goes first.
      for (let i = undo.length - 1; i >= 0; i -= 1) undo[i]();
      root.classList.remove("js", "motion", "ready");
    };
  }, [rootRef]);
}
