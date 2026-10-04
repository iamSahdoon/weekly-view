import { Link } from "react-router-dom";
import { BrandMark } from "../components/shell/BrandMark.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { useAuth } from "../hooks/useAuth.js";

// Design §3.13: inside the shell if signed in, standalone if not. It never
// speculates that something was removed.
export default function NotFoundPage() {
  const { user } = useAuth();
  const content = (
    <EmptyState
      title="That page doesn’t exist."
      action={
        <Button asChild>
          <Link to="/">
            {user ? "Go to this week" : "Go to the start page"}
          </Link>
        </Button>
      }
    >
      Check the link — it may be mistyped or out of date.
    </EmptyState>
  );
  if (user) {
    return (
      <>
        <PageHeader title="Page not found" />
        <PageContainer>{content}</PageContainer>
      </>
    );
  }
  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-paper px-16 pt-96">
      <BrandMark className="mb-32 text-[20px]" />
      {content}
    </main>
  );
}
