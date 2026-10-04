import { PageHeader } from "../components/shell/PageHeader.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";

// A stand-in for a page a later stage builds (the route table must exist now, with
// its guards). Each stage replaces the matching line in routes/index.jsx with the
// real page and nothing else uses this file; C11 deletes it.
export default function PendingPage({ title }) {
  return (
    <>
      <PageHeader title={title} />
      <PageContainer>
        <EmptyState title={title}>
          This page is built in a later stage.
        </EmptyState>
      </PageContainer>
    </>
  );
}
