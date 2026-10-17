import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../../../context/AuthContext.jsx";
import AuthLayout from "../../../layouts/AuthLayout.jsx";
import { qk } from "../../../lib/queryKeys.js";
import SignInPage from "../../../pages/SignInPage.jsx";
import SignUpPage from "../../../pages/SignUpPage.jsx";
import { FINAL_STEP, PREVIEW_STEPS, previewLayer } from "../previewSteps.js";
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
    expect(panel).toMatch(/<div aria-hidden="true" class="row-start-3 flex">/);
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
    expect(html).not.toMatch(/(?<!min-)h-\[100dvh\]|overflow-hidden/);
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
    const transitions = source.match(/transition-(?:\[[a-z,]+\]|[a-z-]+)/g) ?? [];
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
