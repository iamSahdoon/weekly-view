import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";
import { BrandMark } from "./BrandMark.jsx";
import { PageContainer } from "./PageContainer.jsx";
import { PageHeader } from "./PageHeader.jsx";
import { Button } from "../ui/Button.jsx";
import { InlineError } from "../ui/InlineError.jsx";

// The 500 state (design §3.13): "Inline error panel where the content would be, with
// Try again. The shell stays usable." No apology, no exclamation mark, no stack trace.

function Panel({ reset }) {
  return (
    <InlineError title="This page ran into a problem." onRetry={reset}>
      Try again. If it keeps happening, reload the page.
    </InlineError>
  );
}

/** Inside the shell: the title in the top bar and the panel in the content area. */
export function PageError({ reset }) {
  return (
    <>
      <PageHeader title="Something went wrong" />
      <PageContainer size="doc">
        <Panel reset={reset} />
      </PageContainer>
    </>
  );
}

/** Outside the shell (a signed-out page, or the shell itself failing): standalone. */
export function StandaloneError({ reset }) {
  useDocumentTitle("Something went wrong");
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-paper px-16 pt-52 pb-[14vh]">
      <BrandMark className="mb-32 text-[20px]" />
      <div className="w-full max-w-[560px]">
        <Panel reset={reset} />
        <Button variant="secondary" asChild className="mt-16">
          {/* A plain link, not the router: the router may be what failed. */}
          <a href="/">Go to the start page</a>
        </Button>
      </div>
    </main>
  );
}
