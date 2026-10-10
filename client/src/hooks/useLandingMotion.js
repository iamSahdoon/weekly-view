import { useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// The landing page's motion (frontend_architecture.md §9.16; brand §6.0 rules 10–11). It works
// on the DOM under the `.landing` root: the hero's typed blocker that crosses the desk, the two
// guided scroll stories (the team member's week, the manager's dashboard), the entrances of the
// headings and cards, the hero's parallax and the footer's week.
//
// GSAP and ScrollTrigger (owner decision, landing polish) are imported here and nowhere else, so
// they ship in the landing chunk only. `gsap.matchMedia` decides what runs: with motion allowed,
// the entrances and the footer; from 1000px wide as well, the pinned stories (scrubbed, snapping
// to a step) and the parallax. When a condition changes, or the page unmounts, `mm.revert()` kills
// every ScrollTrigger and tween it made and restores the inline styles.
//
// Scrolling never reads layout: each story measures its geometry on refresh (load, resize, the
// fonts arriving) and every scroll frame only writes `transform`, `opacity` and SVG attributes
// from those numbers.
//
// Every effect has a static path. Under `prefers-reduced-motion` the root never gets `.motion`
// and no GSAP effect starts, so nothing is hidden, pinned, typed or drawn; below 1000px the
// stories stay stacked. The effect cleans up everything it adds, so it is safe to mount twice
// (StrictMode).

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const MEDIA = {
  motion: "(prefers-reduced-motion: no-preference)",
  wide: "(min-width: 1000px)",
};
// a strong ease-out, the same curve as landing.css's --l-ease-m
const EASE = "power3.out";

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const out3 = (t) => 1 - Math.pow(1 - t, 3);
const io3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);
const span = (u, a, b) => smooth(clamp((u - a) / (b - a)));
const decimals = (v) => (String(v).split(".")[1] || "").length;
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
// A box relative to another (both from getBoundingClientRect).
const rel = (r, to) => ({
  x: r.left - to.left,
  y: r.top - to.top,
  w: r.width,
  h: r.height,
});
const lerpBox = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});
// How far step `f` (0→1 within a step) has drawn its line: in after `from`, and back out over
// the step's last 8%, so leaving a step takes its line back to the caption in either direction.
const drawn = (f, from) =>
  Math.min(clamp((f - from) / 0.26), clamp((1 - f) / 0.08));

// One story's guide: the caption column (typed, one step at a time) and the SVG overlay (a line
// from the caption to its target, an arrowhead, a ring that settles on the target and, for the
// dashboard, a dim over the rest). Every write is skipped when nothing changed.
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
  const parts = [dim, halo, ln, hd, ring].filter(Boolean);
  [halo, ln].forEach((p) => p.setAttribute("pathLength", "1"));
  let cur = -1;
  let armed = false;
  let typing = null;
  let lineOn = false;
  let dimOn = false;
  const last = new Map();
  const STYLE = new Set(["opacity", "strokeDashoffset", "transform"]);
  const set = (el, name, value) => {
    const prev = last.get(el) || {};
    if (prev[name] === value) return;
    prev[name] = value;
    last.set(el, prev);
    if (STYLE.has(name)) el.style[name] = value;
    else el.setAttribute(name, value);
  };
  const f = (v) => v.toFixed(1);

  const stopTyping = () => {
    if (typing) typing.kill();
    typing = null;
  };
  // The caption is typed when its step arrives, whichever way the visitor scrolls.
  const type = (i) => {
    stopTyping();
    // the caption that is leaving keeps its words while it fades
    caps.forEach((c, j) => {
      if (j !== i) c.classList.remove("typing");
    });
    const el = typedEls[i];
    const text = texts[i];
    const o = { n: 0 };
    let shown = 0;
    el.textContent = "";
    caps[i].classList.add("typing");
    typing = gsap.to(o, {
      n: text.length,
      // the whole sentence in well under a second, however long it is
      duration: Math.min(0.8, Math.max(0.4, text.length * 0.02)),
      ease: "none",
      onUpdate: () => {
        const n = Math.round(o.n);
        if (n === shown) return;
        shown = n;
        el.textContent = text.slice(0, n);
      },
      onComplete: () => {
        el.textContent = text;
        caps[i].classList.remove("typing");
        typing = null;
      },
    });
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

  const PAD = 6;
  const ringBox = (r) => ({
    x: r.x - PAD,
    y: r.y - PAD,
    w: r.w + PAD * 2,
    h: r.h + PAD * 2,
  });
  const hideLine = () => {
    if (!lineOn) return;
    lineOn = false;
    [halo, ln, hd, ring].forEach((el) => set(el, "opacity", "0"));
  };
  // o: where the line starts; r: the target's box; a: 0→1 how far it is drawn;
  // anchor: the side of the target the line arrives on.
  const draw = (o, r, a, anchor) => {
    if (!r || a <= 0) {
      hideLine();
      return;
    }
    lineOn = true;
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
    // the line is drawn along its path (stroke-dash), head last
    const off = (1 - a).toFixed(3);
    [halo, ln].forEach((p) => {
      set(p, "d", path);
      set(p, "strokeDashoffset", off);
      set(p, "opacity", "1");
    });
    set(hd, "d", head);
    set(hd, "opacity", clamp((a - 0.86) / 0.14).toFixed(3));
    // the ring settles onto its target as the line arrives
    const b = ringBox(r);
    set(ring, "x", f(b.x));
    set(ring, "y", f(b.y));
    set(ring, "width", f(b.w));
    set(ring, "height", f(b.h));
    const k = out3(clamp((a - 0.45) / 0.55));
    set(ring, "opacity", k.toFixed(3));
    set(ring, "transform", `scale(${(1.12 - 0.12 * k).toFixed(4)})`);
  };
  // The dashboard's dim: everything in `box` but the ring around `r`, at opacity `o`.
  const spot = (box, r, o) => {
    if (!dim) return;
    if (!r || o <= 0) {
      if (dimOn) set(dim, "opacity", "0");
      dimOn = false;
      return;
    }
    dimOn = true;
    const h = ringBox(r);
    set(
      dim,
      "d",
      `M${f(box.x)} ${f(box.y)}h${f(box.w)}v${f(box.h)}h${f(-box.w)}Z` +
        `M${f(h.x)} ${f(h.y)}v${f(h.h)}h${f(h.w)}v${f(-h.h)}Z`,
    );
    set(dim, "opacity", o.toFixed(3));
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
    lineOn = false;
    dimOn = false;
    last.clear();
    caps.forEach((c, j) => {
      c.classList.remove("on", "typing");
      typedEls[j].textContent = "";
    });
    bars.forEach((b) => b.classList.remove("on"));
    if (num) num.textContent = "1";
    parts.forEach((el) => {
      el.style.opacity = "";
      el.style.transform = "";
      el.style.strokeDashoffset = "";
    });
  };
  return { setStep, arm, draw, spot, size, reset };
}

export function useLandingMotion(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const w = window;
    const d = document;
    const motion = w.matchMedia(MEDIA.motion).matches;
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

    /* ── The CTA pills lean toward a fine pointer ── */
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
    }

    /* ── In-page links glide to their section. ScrollTrigger's snapping sets the page's
          scroll-behavior to auto, so the glide is GSAP's; with reduced motion it is the
          browser's plain jump. The skip link always jumps. ── */
    if (motion) {
      $$('a[href^="#"]').forEach((a) => {
        listen(a, "click", (e) => {
          const id = a.getAttribute("href").slice(1);
          const target = id && id !== "main" ? d.getElementById(id) : null;
          if (!target) return;
          e.preventDefault();
          const y = id === "top" ? 0 : target;
          const dist = Math.abs(
            (id === "top"
              ? 0
              : target.getBoundingClientRect().top + w.scrollY) - w.scrollY,
          );
          gsap.to(w, {
            scrollTo: { y, autoKill: true },
            duration: Math.min(1.4, Math.max(0.6, dist / 5000)),
            ease: "power3.inOut",
            overwrite: true,
            onComplete: () => {
              if (!target.hasAttribute("tabindex"))
                target.setAttribute("tabindex", "-1");
              target.focus({ preventScroll: true });
            },
          });
        });
      });
      undo.push(() => gsap.killTweensOf(w));
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

    /* ── Manager view: filters with a FLIP transition and a live count ── */
    const filterButtons = $$("#desk .fbtn");
    const rows = $$("#mt tbody tr");
    const fcount = $("#fcount");
    let filterTimer = 0;
    let shownFilter = "all";
    const label = {
      corr: "needs correction",
      none: "not started",
      blk: "has a blocker",
    };
    const hit = (tr, f) =>
      f === "all" || ` ${tr.dataset.f} `.indexOf(` ${f} `) > -1;
    const filter = (f) => {
      clearTimeout(filterTimer);
      shownFilter = f;
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

    /* ── Footer: the wordmark is as wide as the page's column, in any typeface ── */
    const mark = $("[data-wordmark]");
    const markText = mark && mark.firstElementChild;
    const fitMark = () => {
      if (!mark) return;
      mark.style.fontSize = "100px";
      const k = mark.clientWidth / Math.max(1, markText.scrollWidth);
      mark.style.fontSize = `${Math.floor(100 * k * 10) / 10}px`;
    };
    fitMark();
    listen(w, "resize", fitMark);
    undo.push(() => {
      if (mark) mark.style.fontSize = "";
    });

    /* ── The two stories: the parts both modes share ── */
    const targetsOf = (scope) => {
      const byStep = new Map();
      $$("[data-t]", scope).forEach((el) => byStep.set(+el.dataset.t, el));
      return byStep;
    };

    // The team member's week: eight steps, Monday to Friday, then the report.
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
    const drRow = $("#week .dr-row");
    const wkCaps = $("#week .story-caps");
    const wkGuide = createGuide($("#wk-guide"), wkCaps);
    const wkTargets = targetsOf(wk);
    const WK_N = 8;
    // where each step's line starts drawing (after the cards have settled)
    const WK_DRAW = [0.12, 0.12, 0.12, 0.45, 0.12, 0.15, 0.62, 0.12];
    // where the scroll comes to rest in each step: its line drawn, its cards still
    const WK_REST = [0.5, 1.5, 2.5, 3.8, 4.5, 5.85, 6.9, 7.75];
    const WK_IDX = [
      [0, 0],
      [3, 0],
      [3.4, 1],
      [5.1, 1],
      [5.8, 4],
      [WK_N, 4],
    ];
    const wkStatic = () => {
      track.style.transform = "";
      drRow.style.transform = "";
      report.style.transform = "";
      report.classList.remove("done");
      days.forEach((c) => {
        c.style.transform = "";
        c.style.opacity = "";
        c.style.zIndex = "";
        c.classList.remove("on");
      });
      wst.style.removeProperty("--l-wk-h");
      sels.forEach((s) => s.classList.add("set"));
      wkGuide.reset();
    };

    // The manager's side: ten steps over the dashboard, which is scaled to fit.
    const desk = $("#desk");
    const dkSticky = $("#desk .dk-sticky");
    const dkHead = $("#desk .dk-head");
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
    const dkStatic = () => {
      monitor.style.transform = "";
      monitor.style.height = "";
      dkGuide.reset();
    };

    wkStatic();
    undo.push(() => {
      wkStatic();
      days.forEach((c) => c.classList.remove("seen"));
      sels.forEach((s) => s.classList.remove("set"));
      dkStatic();
    });

    // A pinned story. The panel is `position: sticky` in a section as tall as the story
    // (landing.css): the browser holds it still, on the compositor, with no layout shift.
    // ScrollTrigger reads the section's progress, smooths it (scrub) and brings the scroll to
    // rest on a step (`rest`, in steps of `n`).
    const pinStory = (section, n, rest, render, measure) => {
      const state = { p: 0 };
      measure();
      render(0);
      gsap.to(state, {
        p: 1,
        ease: "none",
        onUpdate: () => render(state.p),
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          invalidateOnRefresh: true,
          snap: {
            snapTo: [0, ...rest.map((s) => s / n), 1],
            duration: { min: 0.25, max: 0.7 },
            delay: 0.06,
            ease: "power2.inOut",
            // the browser's own momentum has already carried the scroll; projecting it again
            // would skip captions, so the story rests on the next step in that direction
            inertia: false,
          },
          onRefresh: () => {
            measure();
            render(state.p);
          },
        },
      });
    };

    const weekStory = () => {
      wk.classList.add("pin");
      let wg = null;
      const render = (p) => {
        if (!wg) return;
        const u = clamp(p) * WK_N;
        const idx = keyed(WK_IDX, u);
        const tx = wg.sc - (wg.base[0].x + idx * wg.step + wg.cw / 2);
        const e1 = span(u, 6, 6.35); // gather into a stack
        const e2 = span(u, 6.2, 6.7); // the report rises
        // the cards share a top edge; the row sits so the card in front (then the report) is
        // centred in the stage, and the day rail rides just above it
        const lo = Math.floor(idx);
        const hi = Math.min(4, lo + 1);
        const hDay = wg.hs[lo] + (wg.hs[hi] - wg.hs[lo]) * (idx - lo);
        const ty0 = (wg.sh - (hDay + (wg.rh - hDay) * e2)) / 2;
        track.style.transform = `translate3d(${tx.toFixed(1)}px,${ty0.toFixed(1)}px,0)`;
        drRow.style.transform = `translate3d(0,${ty0.toFixed(1)}px,0)`;
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
          const k =
            (sc * (1 - e1) + (1 - (4 - i) * 0.03) * e1) * (1 - 0.16 * e4);
          const r = (rot * (1 - e1) + (i - 2) * 1.4 * e1) * (1 - e4);
          const dy = ty * (1 - e1) + gy + drop;
          shift[i] = [gx, dy];
          c.style.transform = `translate3d(${gx.toFixed(1)}px,${dy.toFixed(1)}px,0) rotate(${r.toFixed(2)}deg) scale(${k.toFixed(4)})`;
          c.style.zIndex = String(i + 1);
          c.style.opacity = e4 >= 1 ? "0" : (op * (1 - e1) + e1).toFixed(3);
          c.classList.toggle("seen", idx > i - 0.5 || e1 > 0);
          c.classList.toggle("on", i === on && settled && e1 < 0.02);
        });
        // the report rises from below the panel into the middle of the stage
        const ry = (1 - e2) * wg.below;
        report.style.transform = `translate3d(-50%,-50%,0) translate3d(0,${ry.toFixed(1)}px,0)`;
        const past = u >= 6.6;
        fill.style.transform = `scaleX(${span(u, 5.8, 6.6).toFixed(4)})`;
        ind.style.transform = `translate3d(${(idx * 56).toFixed(1)}px,0,0)`;
        ind.style.opacity = past ? "0" : "1";
        dayLabels.forEach((l, i) =>
          l.classList.toggle("on", i === on && !past),
        );
        drRep.classList.toggle("on", past);
        const e3 = clamp((u - 7.05) / 0.6);
        sels.forEach((s, i) => s.classList.toggle("set", e3 >= (i + 1) / 4));
        report.classList.toggle("done", e3 >= 1);

        // the caption and its line
        const step = Math.min(WK_N - 1, Math.floor(u));
        wkGuide.setStep(step);
        const t = wg.targets[step];
        const a = drawn(u - step, WK_DRAW[step]);
        let r = null;
        if (t) {
          if (t.owner === "report") r = { ...t, y: t.y + ry };
          else if (t.owner >= 0)
            r = {
              ...t,
              x: t.x + tx + shift[t.owner][0],
              y: t.y + ty0 + shift[t.owner][1],
              // a line that has to reach the top of a card goes round its left edge
              lane: wg.base[t.owner].x + tx + shift[t.owner][0] - 26,
              top: wg.base[t.owner].y + ty0 + shift[t.owner][1],
            };
          else if (t.owner === "rail") r = { ...t, y: t.y + ty0 };
          else r = t;
        }
        wkGuide.draw(wg.origin, r, a, t?.anchor);
      };
      const measure = () => {
        track.style.transform = "";
        days.forEach((c) => {
          c.style.transform = "";
        });
        report.style.transform = "translate3d(-50%,-50%,0)";
        drRow.style.transform = "";
        // read every box at rest: no day's lines mid-slide, no transition running
        wk.classList.add("measuring");
        // the stage is as tall as the tallest thing it shows, so the column centres on it
        const hs = days.map((c) => c.offsetHeight);
        const sh = Math.max(report.offsetHeight, ...hs) + 16;
        wst.style.setProperty("--l-wk-h", `${sh}px`);
        const S = wkSticky.getBoundingClientRect();
        const stageBox = rel(wst.getBoundingClientRect(), S);
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
              : el.closest(".dr-row")
                ? "rail"
                : -1;
          // a card's box is measured where it stands untransformed; the report's at rest
          targets[n] = { ...b, owner, anchor: el.dataset.anchor || "left" };
        });
        wk.classList.remove("measuring");
        wg = {
          sc: stageBox.x + stageBox.w / 2,
          cw: base[0].w,
          step: base[1].x - base[0].x,
          base,
          hs,
          sh,
          rh: rep.h,
          // from the stage's middle to just below the panel
          below: S.height - (rep.y + rep.h / 2) + rep.h / 2 + 24,
          targets,
          origin: [capsBox.x + capsBox.w + 14, capsBox.y + 14],
        };
        wkGuide.size(S.width, S.height);
      };
      pinStory(wk, WK_N, WK_REST, render, measure);
      ScrollTrigger.create({
        trigger: wkCaps,
        start: "top 80%",
        once: true,
        onEnter: () => wkGuide.arm(),
      });
      return () => {
        wk.classList.remove("pin");
        wg = null;
        wkStatic();
      };
    };

    const deskStory = () => {
      desk.classList.add("pin");
      let dg = null;
      const render = (p) => {
        if (!dg) return;
        const u = clamp(p) * DK_N;
        const step = Math.min(DK_N - 1, Math.floor(u));
        const fs = u - step;
        dkGuide.setStep(step);
        if (DK_F[step] !== shownFilter) filter(DK_F[step]);
        const t = dg.targets[step];
        dkGuide.draw(dg.origin, t, drawn(fs, 0.12), "top");
        // the spotlight glides from the last step's target to this one
        const from = dg.targets[Math.max(0, step - 1)];
        const hole =
          t && from ? lerpBox(from, t, step ? span(fs, 0, 0.18) : 1) : t;
        dkGuide.spot(
          dg.box,
          hole,
          Math.min(clamp(u / 0.3), clamp((DK_N - u) / 0.3)),
        );
      };
      const measure = () => {
        monitor.style.transform = "";
        monitor.style.height = "";
        // the dashboard keeps its design width (landing.css) and is scaled to the room it has
        const S0 = dkSticky.getBoundingClientRect();
        const M0 = monitor.getBoundingClientRect();
        const head = dkHead.getBoundingClientRect();
        const box = monitor.parentElement;
        const pad = getComputedStyle(box);
        const roomW =
          box.clientWidth -
          parseFloat(pad.paddingLeft) -
          parseFloat(pad.paddingRight);
        const top = parseFloat(getComputedStyle(dkSticky).paddingTop);
        const roomH =
          S0.height - top - 48 - head.height - (M0.top - head.bottom);
        const k = Math.min(1, roomH / M0.height, roomW / M0.width);
        // the box keeps the scaled height, so the heading and dashboard centre as one group
        monitor.style.height = `${(M0.height * k).toFixed(1)}px`;
        const S = dkSticky.getBoundingClientRect();
        const M = rel(monitor.getBoundingClientRect(), S);
        const capsBox = rel(dkCaps.getBoundingClientRect(), S);
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
      };
      pinStory(
        desk,
        DK_N,
        DK_F.map((_, i) => i + 0.55),
        render,
        measure,
      );
      ScrollTrigger.create({
        trigger: dkCaps,
        start: "top 80%",
        once: true,
        onEnter: () => dkGuide.arm(),
      });
      return () => {
        desk.classList.remove("pin");
        dg = null;
        dkStatic();
        if (shownFilter !== "all") filter("all");
      };
    };

    /* ── The hero's mock-ups drift apart a little as the page leaves them ── */
    const parallax = () => {
      const hero = $(".hero");
      const scroll = {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: 0.4,
      };
      gsap.to($(".hero .lap"), { y: -28, ease: "none", scrollTrigger: scroll });
      gsap.to($(".hero .ph"), {
        y: -72,
        ease: "none",
        scrollTrigger: { ...scroll },
      });
    };

    /* ── Entrances: short, small and staggered; transform and opacity only ── */
    const entrances = (context) => {
      const once = (trigger, start = "top 88%") => ({
        trigger,
        start,
        once: true,
      });

      // the hero arrives on load: the words of the headline rise into place, then the rest
      gsap.from($$(".hero .wi"), {
        yPercent: 110,
        duration: 0.8,
        ease: EASE,
        stagger: 0.045,
        delay: 0.08,
      });
      gsap.from(
        [".hero-k", ".sub", ".acts", ".doors"].map((s) => $(`.hero ${s}`)),
        {
          opacity: 0,
          y: 14,
          duration: 0.6,
          ease: EASE,
          stagger: 0.08,
          delay: 0.2,
        },
      );
      gsap.from(comp, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        delay: 0.3,
      });

      // a section's eyebrow, heading and lede rise together, a beat apart
      $$("[data-head]").forEach((h) => {
        const group = [
          h.previousElementSibling?.matches(".eyebrow") &&
            h.previousElementSibling,
          h,
          h.nextElementSibling?.matches("p:not(.eyebrow)") &&
            h.nextElementSibling,
        ].filter(Boolean);
        gsap.from(group, {
          opacity: 0,
          y: 16,
          duration: 0.6,
          ease: EASE,
          stagger: 0.07,
          scrollTrigger: once(h),
        });
      });
      // the closing line, word by word
      $$("[data-split]")
        .filter((h) => !h.closest(".hero"))
        .forEach((h) => {
          gsap.from($$(".wi", h), {
            yPercent: 110,
            duration: 0.8,
            ease: EASE,
            stagger: 0.05,
            scrollTrigger: once(h, "top 90%"),
          });
        });

      // cards: whatever comes into view together arrives together, one after another
      const offset = (el) =>
        ({
          left: { x: -20 },
          right: { x: 20 },
          fade: {},
          scale: { scale: 0.97 },
        })[el.dataset.reveal] ?? { y: 16 };
      const cards = $$("[data-reveal]").filter((el) => el !== comp);
      cards.forEach((el) => gsap.set(el, { opacity: 0, ...offset(el) }));
      context.add("show", (batch) =>
        gsap.to(batch, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: EASE,
          stagger: 0.08,
          overwrite: true,
        }),
      );
      ScrollTrigger.batch(cards, {
        start: "top 90%",
        once: true,
        onEnter: (batch) => context.show(batch),
      });

      // the line icons draw themselves; the closing arc draws as the page reaches it
      const svgs = new Set($$("[data-draw]").map((p) => p.closest("svg")));
      svgs.forEach((svg) => {
        const paths = $$("[data-draw]", svg);
        if (svg.matches(".farc")) {
          gsap.fromTo(
            paths,
            { strokeDasharray: 1, strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              ease: "none",
              scrollTrigger: {
                trigger: svg.parentElement,
                start: "top 85%",
                end: "center 55%",
                scrub: 0.6,
              },
            },
          );
        } else {
          gsap.fromTo(
            paths,
            { strokeDasharray: 1, strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              duration: 1,
              ease: "power2.out",
              stagger: 0.1,
              scrollTrigger: once(svg, "top 92%"),
            },
          );
        }
      });

      // the dashboard's numbers count up, and its squares fill day by day
      const counters = $$("[data-count]");
      counters.forEach((el) => {
        const to = parseFloat(el.dataset.count);
        const dec = decimals(el.dataset.count);
        const o = { v: parseFloat(el.dataset.from || 0) };
        el.textContent = o.v.toFixed(dec);
        gsap.to(o, {
          v: to,
          duration: +(el.dataset.dur || 1000) / 1000,
          ease: "expo.out",
          onUpdate: () => {
            el.textContent = o.v.toFixed(dec);
          },
          onComplete: () => {
            el.textContent = el.dataset.count;
          },
          scrollTrigger: once(el, "top 90%"),
        });
      });
      ScrollTrigger.create({
        ...once(mt, "top 85%"),
        onEnter: () => mt.classList.add("in"),
      });

      // the footer's week fills in, Monday to Friday; each legend entry lights with its first square
      const fweek = $("[data-week]");
      if (fweek) {
        const fills = $$(".fw-day i", fweek);
        const legend = $$(".fw-leg li", fweek);
        const tl = gsap.timeline({ scrollTrigger: once(fweek, "top 92%") });
        tl.from(fills, {
          opacity: 0,
          scale: 0.6,
          duration: 0.45,
          ease: EASE,
          stagger: 0.16,
        });
        legend.forEach((li) => {
          const first = fills.findIndex((i) => i.className === li.dataset.s);
          tl.from(
            li,
            { opacity: 0.3, duration: 0.35, ease: "power1.out" },
            Math.max(0, first) * 0.16 + 0.1,
          );
        });
      }
      // the wordmark rises out of the footer's floor as the page ends
      if (markText) {
        gsap.fromTo(
          markText,
          { yPercent: 42 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: mark.closest("footer"),
              start: "top bottom",
              end: "bottom bottom",
              scrub: 0.5,
            },
          },
        );
      }

      return () => {
        counters.forEach((el) => {
          el.textContent = el.dataset.count;
        });
      };
    };

    /* ── What runs, and where: GSAP's matchMedia reverts it all when a condition changes ── */
    const mm = gsap.matchMedia();
    mm.add(MEDIA, (context) => {
      const { motion: moving, wide } = context.conditions;
      if (!moving) return undefined;
      const off = [];
      // the stories first, in page order
      if (wide) {
        off.push(weekStory(), deskStory());
        parallax();
      }
      off.push(entrances(context));
      return () => off.forEach((fn) => fn());
    });
    undo.push(() => {
      mm.revert();
      // what ScrollTrigger's snapping leaves on the page
      [d.documentElement, d.body].forEach((el) =>
        el.style.removeProperty("scroll-behavior"),
      );
    });
    if (d.fonts && d.fonts.ready)
      d.fonts.ready.then(() => {
        if (!alive) return;
        fitMark();
        lockHeight();
        ScrollTrigger.refresh();
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
