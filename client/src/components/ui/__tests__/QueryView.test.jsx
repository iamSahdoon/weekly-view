import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QueryView } from "../QueryView.jsx";

// The error state is for a query with nothing to show (frontend_architecture.md §8.4):
// a failed background refetch keeps what already loaded on screen.

const render = (query) =>
  renderToStaticMarkup(
    <QueryView query={query} skeleton={<p>skeleton</p>} error={<p>failed</p>}>
      {(data) => <p>{data.text}</p>}
    </QueryView>,
  );

describe("QueryView", () => {
  it("shows the error when the first load failed", () => {
    expect(render({ isPending: false, isError: true, data: undefined })).toBe(
      "<p>failed</p>",
    );
  });

  it("keeps the loaded data when a refetch fails", () => {
    const html = render({
      isPending: false,
      isError: true,
      isFetching: false,
      data: { text: "loaded" },
    });
    expect(html).toContain("<p>loaded</p>");
    expect(html).not.toContain("failed");
  });
});
