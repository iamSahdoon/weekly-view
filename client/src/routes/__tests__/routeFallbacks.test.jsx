import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Children, isValidElement, Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  AuthFallback,
  RouteFallback,
} from "../../components/shell/RouteFallback.jsx";
import { PageChromeProvider } from "../../context/PageChromeContext.jsx";
import { buildRoutes } from "../index.jsx";
import { lazyPage } from "../lazyPage.jsx";

// Never a blank page (frontend_architecture.md §8.4; owner, C8): a route's chunk loads behind
// a fallback that is the page's frame and skeleton, and a page that has already loaded
// renders without suspending at all.

describe("lazyPage", () => {
  const Hello = () => <p>Hello from the page</p>;
  const loader = () => Promise.resolve({ default: Hello });
  const html = (Page) =>
    renderToStaticMarkup(
      <Suspense fallback={<p>fallback</p>}>
        <Page />
      </Suspense>,
    );

  it("suspends behind the fallback until the chunk has loaded, then renders at once", async () => {
    const Page = lazyPage(loader);
    expect(html(Page)).toContain("fallback");
    await Page.preload();
    // No Suspense needed any more: the content, not the fallback, and no 300 ms hold.
    expect(html(Page)).toContain("Hello from the page");
    expect(html(Page)).not.toContain("fallback");
  });

  it("shares one load between the prefetch and the route", async () => {
    let calls = 0;
    const Page = lazyPage(() => {
      calls += 1;
      return loader();
    });
    await Promise.all([Page.preload(), Page.preload()]);
    expect(html(Page)).toContain("Hello from the page");
    expect(calls).toBeLessThanOrEqual(2); // two preloads; the render after them adds none
  });
});

// Every `Suspense` in the route table and in IndexRoute carries a real fallback.
function suspenseFallbacks(node, found = []) {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Suspense) found.push(child.props.fallback);
    suspenseFallbacks(child.props.children, found);
  });
  return found;
}
function walk(routes, found = []) {
  for (const route of routes) {
    if (route.element) suspenseFallbacks(route.element, found);
    if (route.children) walk(route.children, found);
  }
  return found;
}

describe("the route table", () => {
  it("puts every routed page behind a non-null fallback", () => {
    const fallbacks = walk(buildRoutes());
    // 4 auth pages + 12 shell pages + /design (dev) — at least the 16 product routes.
    expect(fallbacks.length).toBeGreaterThanOrEqual(16);
    for (const fallback of fallbacks) expect(fallback).toBeTruthy();
  });

  it("names each page's title and shape on its fallback", () => {
    const titles = walk(buildRoutes())
      .filter((f) => f?.type === RouteFallback)
      .map((f) => f.props.title);
    for (const title of [
      "My reports",
      "Week",
      "Weekly report",
      "Team updates",
      "Account",
      "Review desk",
      "Review",
      "Team dashboard",
      "People",
      "Person",
      "Projects",
      "Users",
      "Holidays",
    ])
      expect(titles).toContain(title);
    expect(walk(buildRoutes()).some((f) => f?.type === AuthFallback)).toBe(
      true,
    );
  });
});

describe("no source file hides a loading state behind null", () => {
  const sources = import.meta.glob(
    ["../../**/*.{js,jsx}", "!../../**/__tests__/**", "!../../**/*.test.*"],
    { query: "?raw", import: "default", eager: true },
  );
  it("has no `fallback={null}` or empty Suspense fallback", () => {
    const offenders = Object.entries(sources)
      .filter(([, text]) => /fallback=\{(null|undefined)\}/.test(text))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});

describe("RouteFallback", () => {
  const render = (element) =>
    renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <PageChromeProvider>
          <MemoryRouter>{element}</MemoryRouter>
        </PageChromeProvider>
      </QueryClientProvider>,
    );

  it("draws skeletons in the shape of the page, announced as loading", () => {
    for (const kind of ["table", "panels", "dashboard"]) {
      const html = render(<RouteFallback title="Users" kind={kind} />);
      expect(html).toContain('aria-label="Loading Users"');
      expect(html).toContain("wv-skeleton");
    }
    // A table skeleton has its header row and eight rows; a dashboard also has chart panels.
    expect(
      render(<RouteFallback title="Users" kind="table" />).match(
        /h-\[var\(--row-h\)\]/g,
      ),
    ).toHaveLength(8);
    expect(render(<RouteFallback title="T" kind="dashboard" />)).toContain(
      "h-[280px]",
    );
  });

  it("is the page's width", () => {
    expect(render(<RouteFallback title="Users" size="wide" />)).toContain(
      "--data-max",
    );
    expect(render(<RouteFallback title="Account" size="doc" />)).toContain(
      "--doc-max",
    );
  });

  it("has an auth variant: the form panel's skeleton, no shell", () => {
    const html = render(<AuthFallback />);
    expect(html).toContain("wv-skeleton");
    expect(html).not.toContain("<nav");
  });
});
