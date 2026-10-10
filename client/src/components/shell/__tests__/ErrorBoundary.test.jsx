import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PageChromeProvider } from "../../../context/PageChromeContext.jsx";
import { ErrorBoundary } from "../ErrorBoundary.jsx";
import { PageError, StandaloneError } from "../ErrorStates.jsx";

// The 500 state (design §3.13). React runs error boundaries only in the browser, so the
// boundary is exercised through its own methods here; that a crashed page leaves the shell
// usable was walked in a browser (PROGRESS.md, C9).

function boundary(props) {
  const instance = new ErrorBoundary({ fallback: PageError, ...props });
  instance.setState = (update) => {
    instance.state = { ...instance.state, ...update };
  };
  return instance;
}

const inShell = (node) =>
  renderToStaticMarkup(
    <PageChromeProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </PageChromeProvider>,
  );

describe("ErrorBoundary", () => {
  it("renders its children until something throws", () => {
    const child = <p>PAGE</p>;
    expect(boundary({ children: child }).render()).toBe(child);
  });

  it("a thrown render puts the boundary in the failed state and shows the fallback", () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error("boom"))).toEqual({
      failed: true,
    });
    const failed = boundary({ children: <p>PAGE</p> });
    failed.state = { failed: true };
    const shown = failed.render();
    expect(shown.type).toBe(PageError);
    expect(shown.props.reset).toBe(failed.reset);
  });

  it("Try again renders the children again", () => {
    const failed = boundary({ children: <p>PAGE</p> });
    failed.state = { failed: true };
    failed.reset();
    expect(failed.state.failed).toBe(false);
  });

  it("a changed resetKey (the path) clears a failure; the same key does not", () => {
    const failed = boundary({ children: <p>PAGE</p>, resetKey: "/a" });
    failed.state = { failed: true };
    failed.componentDidUpdate({ resetKey: "/a" });
    expect(failed.state.failed).toBe(true);
    failed.componentDidUpdate({ resetKey: "/b" });
    expect(failed.state.failed).toBe(false);
  });

  it("keeps the cause in the console, not on the screen", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    boundary({}).componentDidCatch(new Error("secret detail"), {
      componentStack: "at Page",
    });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
    expect(inShell(<PageError reset={() => {}} />)).not.toContain(
      "secret detail",
    );
  });
});

describe("the 500 state", () => {
  it("is an inline panel with Try again, and no apology or exclamation mark", () => {
    const html = inShell(<PageError reset={() => {}} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("This page ran into a problem.");
    expect(html).toContain("Try again");
    expect(html).not.toContain("!");
    expect(html.toLowerCase()).not.toContain("sorry");
  });

  it("standalone, it is a plain link home, since the router may be what failed", () => {
    const standalone = renderToStaticMarkup(
      <StandaloneError reset={() => {}} />,
    );
    expect(standalone).toContain('href="/"');
    expect(standalone).toContain("Try again");
  });
});
