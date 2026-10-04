import { Link } from "react-router-dom";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";

// Design §3.13: shown inside the shell. The line comes from `allow`, and it never
// names what is behind the wall (frontend_architecture.md §4.1).
export default function ForbiddenPage({ allow = [] }) {
  const line = allow.includes("manager")
    ? "This area is for managers."
    : "This area is for admins.";
  return (
    <>
      <PageHeader title="No access" />
      <PageContainer>
        <EmptyState
          title="You don’t have access to this page."
          action={
            <Button asChild>
              <Link to="/">Go to this week</Link>
            </Button>
          }
        >
          {line}
        </EmptyState>
      </PageContainer>
    </>
  );
}
