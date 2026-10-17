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

  it("draws the brand panel's week as five Updates squares, hidden from screen readers", () => {
    const panel = html.slice(html.indexOf('aria-label="About WeeklyView"'));
    expect(panel.match(/data-state="posted"/g)).toHaveLength(5);
    expect(panel).toMatch(/<div aria-hidden="true" class="grid grid-cols-5/);
    expect(text(panel)).toContain("One short update a day.");
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

describe("the auth screens stay in the app's look", () => {
  const files = [
    "../../../layouts/AuthLayout.jsx",
    "../AuthBrandPanel.jsx",
    "../AuthScreen.jsx",
  ].map((f) => readFileSync(new URL(f, import.meta.url), "utf8"));

  it("uses no hex value, no landing token, no landing font and no rounded corner", () => {
    for (const source of files) {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/--l-|Bricolage|rounded/);
    }
  });
});
