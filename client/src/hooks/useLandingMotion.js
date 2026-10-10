import { useLayoutEffect } from "react";

// The landing page's motion (frontend_architecture.md §9.16), ported from the inline
// scripts of landing-reference/index.html: reveals, split headings, counters, SVG
// drawing, the pinned week, the folding problem, the opening monitor, the ledger spine,
// the server check, and the hero's typed blocker that crosses the desk. It works on
// the DOM under the `.landing` root, as the reference did on the document.
//
// Every effect has a static path. Under `prefers-reduced-motion` the root never gets
// `.motion`, so nothing starts hidden and nothing travels; what stays is what is not
// motion (the stage fitting its column, the filter buttons, the header's state).
// The effect cleans up everything it adds, so it is safe to mount twice (StrictMode).

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const out3 = (t) => 1 - Math.pow(1 - t, 3);
const io3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const decimals = (v) => (String(v).split(".")[1] || "").length;

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
      active.forEach((el) => apply(el, progress(el)));
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
    const chrome = () => {
      railTick = false;
      if (header) header.classList.toggle("scrolled", w.scrollY > 12);
      if (rail) {
        const h = d.documentElement.scrollHeight - w.innerHeight;
        rail.style.transform = `scaleX(${(h > 0 ? w.scrollY / h : 0).toFixed(4)})`;
      }
    };
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
    const mHrs = $("#m-hrs");
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
      mHrs.textContent = "93";
      fly.style.opacity = 0;
      trail.style.transition = "none";
      trail.style.opacity = 0;
    };
    const land = () => {
      stage.classList.add("landed");
      cell.classList.add("flash");
      row.classList.add("hi");
      count(rHrs, 7.5, 14.5, 900, 1);
      count(mHrs, 93, 100, 900, 0);
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
        mHrs.textContent = "100";
      });
      undo.push(() => {
        halt();
        // Back to the state the markup holds: sent, landed, typed.
        stage.classList.add("sent", "landed");
        bf.classList.add("filled");
        bf.classList.remove("typing");
        typed.textContent = TEXT;
        rHrs.textContent = "14.5";
        mHrs.textContent = "100";
        fly.style.opacity = "";
        trail.style.opacity = "";
        trail.style.transition = "";
      });
    }

    /* ── The week: Monday to Friday on a horizontal track, then the report ── */
    const wk = $("#week");
    const track = $("#track");
    const days = $$("#track > .day");
    const report = $("#report");
    const wst = $("#wk-stage");
    const fill = $("#dayfill");
    const dayLabels = $$("#dayrail li");
    const sels = $$("#report .st");
    const ind = $("#dr-ind");
    const drRep = $(".dr-rep");
    const wide = w.matchMedia("(min-width: 900px)");
    let geo = null;
    const pinOn = () => motion && wide.matches;
    const unpin = () => {
      track.style.transform = "";
      report.style.transform = "";
      report.classList.remove("done");
      days.forEach((c) => {
        c.style.transform = "";
        c.style.opacity = "";
        c.style.zIndex = "";
        c.classList.remove("on");
        c.classList.add("seen");
      });
      sels.forEach((s) => s.classList.add("set"));
    };
    /* Timeline (share of the pinned scroll):
       0 → A   the track walks Monday to Friday; each day fills as it arrives
       A → B   the five cards gather into a stack in the middle
       B → B2  the report rises into place while the stack lifts slightly
       B2 → C  the cards drop quickly under the report and are gone
       C → 1   the report's statuses are set, Submit is ready */
    const A = 0.56;
    const B = 0.66;
    const B2 = 0.74;
    const C = 0.82;
    const render = (p) => {
      if (!geo) return;
      const pt = clamp(p / A);
      const idx = pt * 4;
      const step = geo.cw + geo.gap;
      /* the focus point slides from the left edge of the text column to the centre,
         so Monday starts where the copy starts */
      const fx = geo.x0 + geo.cw / 2 + (geo.vw / 2 - geo.x0 - geo.cw / 2) * pt;
      const x = fx - (idx * step + geo.cw / 2);
      const e1 = out3(clamp((p - A) / (B - A)));
      const e2 = out3(clamp((p - B) / (B2 - B)));
      track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      const on = Math.min(4, Math.round(idx));
      days.forEach((c, i) => {
        const dd = i - idx;
        const ad = Math.min(Math.abs(dd), 2);
        /* travelling: the current day lifts, its neighbours lean away and settle lower */
        const ty = ad < 1 ? -16 * (1 - ad) : 8 * (ad - 1);
        let rot = Math.max(-1, Math.min(1, dd)) * 3.2;
        const sc = 1 - ad * 0.04;
        if (ad < 1) rot *= ad;
        /* gathering: into a neat stack in the middle */
        const cx = x + i * step + geo.cw / 2;
        const cy = geo.rc - geo.ch[i] / 2 - 6;
        const gx = (geo.vw / 2 - cx) * e1;
        const gy = ((i - 4) * 12 + cy - 60) * e1;
        const grot = (i - 2) * 1.6;
        const gsc = 1 - (4 - i) * 0.03;
        const yy = ty * (1 - e1) + gy;
        let r = rot * (1 - e1) + grot * e1;
        let k = sc * (1 - e1) + gsc * e1;
        /* lift as the report arrives, then drop under it, back cards first */
        const lift = -24 * e2;
        const dl = (4 - i) * 0.14;
        const e4 = clamp(((p - B2) / (C - B2)) * 1.7 - dl);
        const e4e = e4 * e4 * (3 - 2 * e4);
        const drop = (60 + 24 + (4 - i) * 12) * e4e;
        k *= 1 - 0.16 * e4e;
        r *= 1 - e4e;
        c.style.transform = `translate3d(${gx.toFixed(1)}px,${(yy + lift + drop).toFixed(1)}px,0) rotate(${r.toFixed(2)}deg) scale(${k.toFixed(4)})`;
        c.style.zIndex = i + 1;
        c.style.opacity = e4 >= 1 ? 0 : "";
        c.classList.toggle("seen", idx > i - 0.5 || e1 > 0);
        c.classList.toggle("on", i === on && e1 < 0.02);
      });
      const y = (1 - e2) * (geo.vh / 2 + geo.rh / 2 + 60);
      report.style.transform = `translate3d(-50%,-50%,0) translate3d(0,${y.toFixed(1)}px,0)`;
      fill.style.transform = `scaleX(${clamp((p - A) / (B2 - A)).toFixed(4)})`;
      ind.style.transform = `translate3d(${(idx * 56).toFixed(1)}px,0,0)`;
      dayLabels.forEach((l, i) => l.classList.toggle("on", i === on && p < B2));
      ind.style.opacity = p < B2 ? 1 : 0;
      drRep.classList.toggle("on", p >= B2);
      const e3 = clamp((p - C - 0.02) / (1 - C - 0.06));
      sels.forEach((s, i) => s.classList.toggle("set", e3 >= (i + 1) / 4));
      report.classList.toggle("done", e3 >= 1);
    };
    const measureWeek = () => {
      const on = pinOn();
      wk.classList.toggle("pin", on);
      if (!on) {
        geo = null;
        unpin();
        return;
      }
      const head = $("#week .wk-head");
      const cs = getComputedStyle(head);
      days.forEach((c) => {
        c.style.transform = "";
      });
      geo = {
        vw: wst.clientWidth,
        vh: wst.clientHeight,
        cw: days[0].offsetWidth,
        gap: parseFloat(getComputedStyle(track).columnGap) || 24,
        rh: report.offsetHeight,
        x0:
          head.getBoundingClientRect().left -
          wst.getBoundingClientRect().left +
          parseFloat(cs.paddingLeft),
        ch: days.map((c) => c.offsetHeight),
        rc: wst.clientHeight / 2 - track.offsetTop,
      };
      render(wk._p || 0);
    };
    measureWeek();
    onScene(wk, (p) => {
      if (pinOn()) render(p);
    });
    listen(w, "resize", measureWeek);
    listen(wide, "change", measureWeek);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(measureWeek);
    undo.push(() => {
      wk.classList.remove("pin");
      geo = null;
      unpin();
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

    /* ── Problem: five copies of the week fold into one update as the list is struck through ── */
    const prob = $("#prob");
    const pile = $("#pile");
    const fragments = $$("#pile .fg");
    const one = $("#one");
    const fiveItems = $$("#five li");
    let fgeo = null;
    const pileMeasure = () => {
      const pr = pile.getBoundingClientRect();
      fgeo = fragments.map((f) => {
        const st = f.style.transform;
        f.style.transform = `rotate(${getComputedStyle(f).getPropertyValue("--l-r")})`;
        const r = f.getBoundingClientRect();
        f.style.transform = st;
        return [
          pr.left + pr.width / 2 - (r.left + r.width / 2),
          pr.top + pr.height / 2 - (r.top + r.height / 2),
        ];
      });
    };
    /* the order the fragments fold in: Mon, Tue, Wed, Thu, Fri */
    const pileRender = (q) => {
      if (!fgeo) pileMeasure();
      fragments.forEach((f, i) => {
        const t = clamp((q - i * 0.13) / 0.22);
        const e = t * t * (3 - 2 * t);
        const r =
          parseFloat(getComputedStyle(f).getPropertyValue("--l-r")) || 0;
        f.style.transform = `translate3d(${(fgeo[i][0] * e).toFixed(1)}px,${(fgeo[i][1] * e).toFixed(1)}px,0) rotate(${(r * (1 - e)).toFixed(2)}deg) scale(${(1 - 0.45 * e).toFixed(3)})`;
        f.style.opacity = t >= 1 ? 0 : "";
        fiveItems[i].classList.toggle("x", t > 0.35);
      });
      const o = clamp((q - 0.62) / 0.2);
      const oe = 1 - Math.pow(1 - o, 3);
      one.style.opacity = o > 0 ? 1 : 0;
      one.style.transform = `translate3d(0,${(18 * (1 - oe)).toFixed(1)}px,0) scale(${(0.86 + 0.14 * oe).toFixed(3)})`;
    };
    if (motion) {
      onScene(prob, () => {
        const r = pile.getBoundingClientRect();
        const vh = w.innerHeight;
        /* spread over most of a screen of scrolling, so each fold is seen */
        pileRender(clamp((vh * 0.8 - r.top) / (vh * 0.85)));
      });
      listen(w, "resize", () => {
        fragments.forEach((f) => {
          f.style.transform = "";
        });
        fgeo = null;
      });
      undo.push(() => {
        fragments.forEach((f) => {
          f.style.transform = "";
          f.style.opacity = "";
        });
        one.style.opacity = "";
        one.style.transform = "";
        fiveItems.forEach((l) => l.classList.remove("x"));
      });
    } else {
      fragments.forEach((f) => {
        f.style.display = "none";
      });
      fiveItems.forEach((l) => l.classList.add("x"));
      undo.push(() => {
        fragments.forEach((f) => {
          f.style.display = "";
        });
        fiveItems.forEach((l) => l.classList.remove("x"));
      });
    }

    /* ── Manager view: the monitor opens towards you as it arrives ── */
    const desk = $("#desk");
    const monitor = $("#monwrap");
    if (motion) {
      onScene(desk, () => {
        const r = monitor.getBoundingClientRect();
        const vh = w.innerHeight;
        const t = clamp((vh - r.top) / (vh * 0.7));
        const e = 1 - Math.pow(1 - t, 3);
        monitor.style.transform = `translate3d(0,${(70 * (1 - e)).toFixed(1)}px,0) rotateX(${(26 * (1 - e)).toFixed(2)}deg) scale(${(0.92 + 0.08 * e).toFixed(4)})`;
      });
      undo.push(() => {
        monitor.style.transform = "";
      });
    }
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
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(lockHeight);

    /* ── Both sides: each vertebra clicks into the spine as it reaches the middle of the screen ── */
    const sides = $("#sides");
    const ledger = $(".ledger");
    const lrows = $$(".lrow");
    if (motion) {
      onScene(sides, () => {
        const vh = w.innerHeight;
        const lr = ledger.getBoundingClientRect();
        ledger.style.setProperty(
          "--l-sp",
          clamp((vh * 0.9 - lr.top) / lr.height).toFixed(4),
        );
        lrows.forEach((lrow) => {
          const r = lrow.getBoundingClientRect();
          const t = clamp((vh * 0.92 - r.top) / (vh * 0.42));
          const e = 1 - Math.pow(1 - t, 3);
          lrow.style.setProperty("--l-t", e.toFixed(4));
          lrow.classList.toggle("clip", t >= 1);
        });
      });
      undo.push(() => {
        ledger.style.removeProperty("--l-sp");
        lrows.forEach((lrow) => {
          lrow.style.removeProperty("--l-t");
          lrow.classList.remove("clip");
        });
      });
    }

    /* ── Limits: four requests go to the server, one at a time, and come back with an answer ── */
    const srv = $("#srv");
    const node = $("#srv-node");
    const dot = $("#srv-dot");
    const questions = $$("#srv .srv-q li");
    if (motion) {
      let srvTimers = [];
      let srvFrame = 0;
      let played = false;
      const srvLater = (ms, fn) => srvTimers.push(later(ms, fn));
      const srvReset = () => {
        srvTimers.forEach(clearTimeout);
        srvTimers = [];
        cancelAnimationFrame(srvFrame);
        questions.forEach((q) => q.classList.remove("done", "ask"));
        dot.style.opacity = 0;
        node.classList.remove("ping");
      };
      const move = (y0, y1, dur, done) => {
        let t0 = null;
        const step = (ts) => {
          if (!t0) t0 = ts;
          const k = Math.min((ts - t0) / dur, 1);
          const e = io3(k);
          dot.style.transform = `translate3d(0,${(y0 + (y1 - y0) * e).toFixed(1)}px,0)`;
          if (k < 1) srvFrame = requestAnimationFrame(step);
          else if (done) done();
        };
        srvFrame = requestAnimationFrame(step);
      };
      const srvPlay = () => {
        srvReset();
        const sr = srv.getBoundingClientRect();
        const ny = node.getBoundingClientRect().bottom - sr.top - 8;
        questions.forEach((q, i) => {
          const qy = q.getBoundingClientRect().top - sr.top + 13;
          srvLater(i * 1250, () => {
            q.classList.add("ask");
            dot.style.opacity = 1;
            move(qy, ny, 420, () => {
              node.classList.add("ping");
              srvLater(220, () => {
                node.classList.remove("ping");
                move(ny, qy, 380, () => {
                  q.classList.remove("ask");
                  q.classList.add("done");
                  dot.style.opacity = 0;
                });
              });
            });
          });
        });
      };
      observe(
        { threshold: [0, 0.5] },
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio > 0.5 && !played) {
              played = true;
              srvPlay();
            } else if (!e.isIntersecting && played) {
              played = false;
              srvReset();
              questions.forEach((q) => q.classList.add("done"));
            }
          });
        },
        [srv],
      );
      undo.push(() => {
        srvReset();
        questions.forEach((q) => q.classList.remove("done", "ask"));
      });
    }

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
