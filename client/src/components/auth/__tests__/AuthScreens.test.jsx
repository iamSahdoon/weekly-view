import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../../../context/AuthContext.jsx";
import { AuthBrandPanel } from "../AuthBrandPanel.jsx";
import AuthLayout from "../../../layouts/AuthLayout.jsx";
import { qk } from "../../../lib/queryKeys.js";
import SignInPage from "../../../pages/SignInPage.jsx";
import SignUpPage from "../../../pages/SignUpPage.jsx";
import { FINAL_STEP, PREVIEW_STEPS, previewLayer } from "../previewSteps.js";
import { PANEL_INTROS } from "../panelIntros.js";
import { ResponseLost } from "../ResponseLost.jsx";

// The auth screens as one set (owner decision, auth pages 2026-10-17; design §3.12): the
// split frame, the way back to the start page, the brand panel's week of squares, and the
// links that follow the bootstrap check. The look is checked by eye; what is checked here
// is what the brief makes a rule.

const AUTH = {
  status: "unauthenticated",
  user: null,
  isDemo: false,
  signInPath: "/signin",
  signIn() {},
  signOut() {},
};

function render(path, bootstrap) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  if (bootstrap !== undefined) client.setQueryData(qk.bootstrap(), bootstrap);
  return renderToStaticMarkup(
    <AuthContext.Provider value={AUTH}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}
const text = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

describe("the frame", () => {
  const html = render("/signin", { available: false });

  it("has a way back to the start page, in the slim header and on the form side", () => {
    const back = html.match(/<a [^>]*href="\/"[^>]*>[^]*?Back to home<\/a>/g);
    expect(back).toHaveLength(2);
  });

  it("puts the form first: the main landmark before the brand panel", () => {
    expect(html.indexOf('id="main"')).toBeGreaterThan(0);
    expect(html.indexOf('id="main"')).toBeLessThan(
      html.indexOf('aria-label="About WeeklyView"'),
    );
  });

  it("draws the brand panel's sample week in the product's real Updates states, hidden from screen readers", () => {
    const panel = html.slice(html.indexOf('aria-label="About WeeklyView"'));
    const states = [...panel.matchAll(/data-state="([a-z_]+)"/g)].map(
      (m) => m[1],
    );
    // Mon–Wed posted, Thursday today (with the posted square that fills in over it), Friday a holiday.
    expect(states).toEqual([
      "posted",
      "posted",
      "posted",
      "today",
      "posted",
      "holiday",
    ]);
    expect(panel).toContain("SAMPLE DATA");
    expect(panel).toMatch(
      /<div aria-hidden="true"><div class="border border-hair bg-card">/,
    );
    expect(text(panel)).toContain("One short update a day.");
  });

  it("puts the brand panel on the left and the form on the right, two equal halves (owner, round three)", () => {
    expect(html).toContain("lg:grid-cols-2");
    expect(html).toMatch(/<main[^>]*class="[^"]*lg:col-start-2/);
    expect(html).toMatch(/<aside[^>]*class="[^"]*lg:col-start-1/);
    // The form stays first in the DOM: focus, screen readers and the phone layout.
    expect(html.indexOf("<main")).toBeLessThan(html.indexOf("<aside"));
  });

  it("lays the two blocks on shared rows, so their edges line up, and never clips", () => {
    expect(html).toContain(
      "lg:grid-rows-[minmax(52px,1fr)_auto_auto_auto_auto_minmax(52px,1fr)]",
    );
    for (const block of ["form", "brand"]) {
      expect(html).toMatch(
        new RegExp(`data-auth-block="${block}" class="[^"]*grid-rows-subgrid`),
      );
    }
    // No fixed height and no clipping on the frame or the form side. (The brand panel
    // clips only its oversized, drifting grid layer; it has no fixed height either.)
    const frame = /^<div class="([^"]*)"/.exec(html)[1];
    const main = /<main[^>]*class="([^"]*)"/.exec(html)[1];
    const aside = /<aside[^>]*class="([^"]*)"/.exec(html)[1];
    for (const cls of [frame, main])
      expect(cls).not.toMatch(/(?<!min-)h-\[100dvh\]|overflow-hidden/);
    expect(aside).not.toMatch(/(?<!min-)h-\[100dvh\]|h-screen/);
  });
});

describe("sign in", () => {
  it("has the large heading and keeps the form and the forgotten-password help", () => {
    const html = render("/signin", { available: false });
    expect(html).toMatch(/<h1[^>]*>Sign in to WeeklyView<\/h1>/);
    expect(html).toContain('name="password"');
    expect(text(html)).toContain("Forgot your password?");
  });

  it("offers the owner account only when sign-up is open", () => {
    expect(render("/signin", { available: true })).toContain('href="/signup"');
    expect(render("/signin", { available: false })).not.toContain(
      'href="/signup"',
    );
    // Pending (nothing known yet): nothing offered.
    expect(render("/signin")).not.toContain('href="/signup"');
  });
});

describe("create account", () => {
  it("open: says it is the team's owner account and that everyone else joins by invite", () => {
    const words = text(render("/signup", { available: true }));
    expect(words).toContain("Create the owner account");
    expect(words).toContain("this account will be the admin and the owner");
    expect(words).toContain(
      "Everyone else joins with an invite link from you.",
    );
  });

  it("closed: the invite-only state, unchanged", () => {
    const words = text(render("/signup", { available: false }));
    expect(words).toContain("This team is invite-only.");
    expect(words).toContain("Open the demo");
  });
});

// Owner report (2026-10-17): a sign-up whose answer was lost. The choice of screen is
// lib/authRecovery (tested there); this is what the screen says and where it leads.
describe("an answer that never arrived", () => {
  const block = (props) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <ResponseLost email="owner@example.com" {...props} />
      </MemoryRouter>,
    );

  it("says the account may exist, and offers Sign in", () => {
    const html = block();
    expect(text(html)).toContain(
      "Your account may already have been created. Sign in with the email you just used.",
    );
    expect(html).toMatch(/<a [^>]*href="\/signin"[^>]*>Sign in<\/a>/);
    expect(text(html)).not.toContain("invite-only");
  });

  it("a reset link says the password may be saved", () => {
    expect(
      text(
        block({
          title: "Your new password may already have been saved.",
          line: "Sign in with your new password.",
        }),
      ),
    ).toContain("Your new password may already have been saved.");
  });
});

// Owner decision (auth pages, round three): the sample week loops, lightly.
describe("the brand panel's loop", () => {
  const source = readFileSync(
    new URL("../AuthBrandPanel.jsx", import.meta.url),
    "utf8",
  );

  it("walks Monday to Thursday, posts Thursday, and takes 12–16 s a cycle", () => {
    expect(PREVIEW_STEPS.map((s) => s.day)).toEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "thu",
    ]);
    expect(PREVIEW_STEPS.map((s) => s.thuPosted)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
    const total = PREVIEW_STEPS.reduce((n, s) => n + s.ms, 0);
    expect(total).toBeGreaterThanOrEqual(12000);
    expect(total).toBeLessThanOrEqual(16000);
    expect(previewLayer(FINAL_STEP)).toBe("thu-posted");
    expect(previewLayer(3)).toBe("thu-empty");
  });

  it("moves only opacity and transform, on one timer, and waits while hidden", () => {
    const transitions =
      source.match(/transition-(?:\[[a-z,]+\]|[a-z-]+)/g) ?? [];
    expect(new Set(transitions)).toEqual(
      new Set([
        "transition-opacity",
        "transition-transform",
        "transition-[opacity,scale]",
      ]),
    );
    expect(source.match(/setTimeout\(/g)).toHaveLength(1);
    expect(source).not.toMatch(/setInterval|requestAnimationFrame/);
    expect(source).toContain('"visibilitychange"');
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("useReducedMotion");
  });
});

// Owner feedback, round four: the loop's fixes, the panel's own line, the grid, the entrance.
describe("the brand panel, round four", () => {
  const html = render("/signin", { available: false });
  const panel = html.slice(html.indexOf('aria-label="About WeeklyView"'));
  const css = readFileSync(
    new URL("../../../styles/base.css", import.meta.url),
    "utf8",
  );

  it("marks one chosen day only: one bar, no 'today' underline", () => {
    expect(panel.match(/data-preview-bar=""/g)).toHaveLength(1);
    expect(panel).not.toMatch(/bottom-0 h-2 bg-acc/);
  });

  it("changes day in sequence: the shown day fades in only after the others have faded out", () => {
    const layers = [
      ...panel.matchAll(/data-preview-layer="([a-z-]+)" class="([^"]*)"/g),
    ].map(([, key, cls]) => ({ key, cls }));
    expect(layers.map((l) => l.key)).toEqual([
      "mon",
      "tue",
      "wed",
      "thu-posted",
      "thu-empty",
    ]);
    const shown = layers.filter((l) => l.cls.includes("opacity-100"));
    expect(shown.map((l) => l.key)).toEqual(["mon"]);
    const ms = (cls, prop) =>
      Number(new RegExp(`${prop}-\\[(\\d+)ms\\]`).exec(cls)?.[1] ?? 0);
    const fadeIn = shown[0].cls;
    for (const out of layers.filter((l) => l !== shown[0]))
      expect(ms(fadeIn, "delay")).toBeGreaterThanOrEqual(
        ms(out.cls, "delay") + ms(out.cls, "duration"),
      );
  });

  it("keeps the sample card at its natural height", () => {
    expect(panel).not.toMatch(/bg-card[^"]*(h-full|flex-1)/);
  });

  it("draws the grid on one drifting layer, still under reduced motion and paused with the panel", () => {
    expect(panel.match(/wv-grid-drift/g)).toHaveLength(1);
    expect(css).toMatch(
      /\[data-paused\] \.wv-grid-drift,\s*\[data-paused\] \.wv-grid-cell \{\s*animation-play-state: paused;/,
    );
    const reduced = css.slice(
      css.lastIndexOf("@media (prefers-reduced-motion"),
    );
    for (const name of [
      ".wv-grid-drift",
      ".wv-grid-cell",
      ".wv-grid-cell[data-turn]",
      ".wv-auth-enter",
      ".wv-auth-fade",
    ])
      expect(reduced).toContain(name);
    expect(reduced).toContain("animation: none");
  });

  it("brings the pair in on arrival: the brand side first, then the form", () => {
    expect(html).toMatch(/data-auth-block="brand" class="wv-auth-enter /);
    expect(html).toMatch(/data-auth-block="form" class="wv-auth-enter-late /);
  });

  it("gives every screen its own short line, in plain sentence case", () => {
    for (const [key, copy] of Object.entries(PANEL_INTROS)) {
      const words = [copy.title, copy.line, ...(copy.steps ?? []).flat()]
        .filter(Boolean)
        .join(" ");
      expect(words, key).not.toContain("!");
      expect(copy.title.split(" ").slice(1).join(" "), key).not.toMatch(
        /\b(?!WeeklyView|Users)[A-Z][a-z]/,
      );
    }
    expect(PANEL_INTROS.signup.steps).toHaveLength(3);
  });

  it("each screen names its line, and an expired link or a lost answer overrides it", () => {
    const source = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
    for (const [file, key] of [
      ["../../../pages/SignInPage.jsx", "signin"],
      ["../../../pages/SignUpPage.jsx", "signup"],
      ["../../../pages/SignUpPage.jsx", "closed"],
      ["../../../pages/AcceptInvitePage.jsx", "invite"],
      ["../../../pages/ResetPasswordPage.jsx", "reset"],
    ])
      expect(source(file), `${file} ${key}`).toContain(`intro="${key}"`);
    expect(source("../LinkExpired.jsx")).toContain(
      'useAuthIntro("expired", { override: true })',
    );
    expect(source("../ResponseLost.jsx")).toContain(
      'useAuthIntro("lost", { override: true })',
    );
  });

  it("keeps a short screen's parts together across the heading and panel rows", () => {
    const closed = render("/signup", { available: false });
    expect(closed).toMatch(
      /<main[^]*<div class="lg:row-span-2"><div class="pb-32"><h1/,
    );
    expect(html).toMatch(/<div class="contents"><div class="pb-32"><h1/);
  });
});

// Owner feedback, round five: the intro on a card; a livelier grid.
describe("the brand panel, round five", () => {
  const css = readFileSync(
    new URL("../../../styles/base.css", import.meta.url),
    "utf8",
  );
  const panelFor = (intro) =>
    renderToStaticMarkup(<AuthBrandPanel intro={intro} />);

  it("puts every screen's line on a card drawn like the sample card, 24px above it", () => {
    for (const intro of Object.keys(PANEL_INTROS)) {
      const html = panelFor(intro);
      expect(html, intro).toContain(
        `<div class="mt-auto pb-24"><div data-panel-intro="${intro}" class="wv-fade-in border border-hair bg-card px-20 py-16">`,
      );
      expect(html, intro).toContain(
        '<div aria-hidden="true"><div class="border border-hair bg-card">',
      );
    }
  });

  it("drifts one square every 14 s, and lights eight cells in four turns on the same clock", () => {
    expect(css).toMatch(
      /\.wv-grid-drift \{\s*animation: wv-grid-drift 14s linear infinite;/,
    );
    expect(css).toMatch(
      /\.wv-grid-cell \{[^}]*animation: 14s linear infinite both;/,
    );
    const html = panelFor("signin");
    const layer = html.slice(
      html.indexOf("wv-grid-drift"),
      html.indexOf('data-auth-block="brand"'),
    );
    const turns = [
      ...layer.matchAll(/data-turn="(\d)" class="wv-grid-cell"/g),
    ].map((m) => m[1]);
    expect(turns).toEqual(["0", "1", "2", "3", "0", "1", "2", "3"]);
    // Until the panel is measured, every cell waits hidden: none is ever placed blind.
    expect(layer.match(/visibility:hidden/g)).toHaveLength(8);
  });

  it("keeps each cell dark at the drift's seam, low in contrast, and from the theme's own --acc", () => {
    for (const turn of [0, 1, 2, 3]) {
      const start = css.indexOf(`@keyframes wv-cell-${turn} {`);
      const frames = css.slice(start, css.indexOf("\n}", start));
      expect(frames, `turn ${turn}`).toMatch(/0%[^{]*\{\s*opacity: 0;/);
      expect(frames, `turn ${turn}`).toMatch(/100% \{\s*opacity: 0;/);
      expect(frames).toContain("opacity: var(--cell-peak)");
    }
    expect(css).toMatch(/\.wv-grid-cell \{[^}]*background: var\(--acc\);/);
    const peaks = [...css.matchAll(/--cell-peak: ([\d.]+);/g)].map(
      (m) => +m[1],
    );
    expect(peaks).toEqual([0.12, 0.28]);
    expect(css).toContain('[data-theme="dark"] .wv-grid-cell {');
  });
});

describe("the auth screens stay in the app's look", () => {
  const files = [
    "../../../layouts/AuthLayout.jsx",
    "../AuthBrandPanel.jsx",
    "../AuthScreen.jsx",
    "../ResponseLost.jsx",
  ].map((f) => readFileSync(new URL(f, import.meta.url), "utf8"));

  it("uses no hex value, no landing token, no landing font and no rounded corner", () => {
    for (const source of files) {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/--l-|Bricolage|rounded/);
    }
  });
});
