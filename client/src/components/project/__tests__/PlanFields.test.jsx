import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { PlanFields } from "../PlanModal.jsx";

// The Plan group is shared by PlanModal and the project modal, so the hint under Planned
// hours (owner, C8) is in both.

const HINT =
  "Optional. Total hours for the whole project, all people combined. Compared with the hours logged.";

function Group({ prefix = "" }) {
  const form = useForm({
    defaultValues: prefix
      ? { plan: { startDate: "", plannedDays: "", plannedHours: "" } }
      : { startDate: "", plannedDays: "", plannedHours: "" },
  });
  return <PlanFields form={form} prefix={prefix} />;
}
const render = (prefix) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <Group prefix={prefix} />
    </QueryClientProvider>,
  );

describe("PlanFields", () => {
  it("says what Planned hours is, in one line under it, in the plan modal and the project modal", () => {
    for (const prefix of ["", "plan."]) {
      const html = render(prefix);
      expect(html).toContain(HINT);
      // Under the Planned hours input, and wired to it for a screen reader.
      expect(html.indexOf("Planned hours")).toBeLessThan(
        html.indexOf("Optional. Total hours"),
      );
      expect(html).toMatch(/aria-describedby="[^"]+-helper"/);
    }
  });

  it("does not repeat 'Optional' as a marker beside the label", () => {
    expect(render("").match(/>Optional</g) ?? []).toHaveLength(0);
  });
});
