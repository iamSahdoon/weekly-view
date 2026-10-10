import { PageHeader } from "./PageHeader.jsx";
import { PageContainer } from "./PageContainer.jsx";
import { AuthPanel } from "../auth/AuthScreen.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";

// What a route shows while its chunk loads (frontend_architecture.md §8.4; design §6.16,
// §11 rule 10): never a blank page. It is the page's own frame — the title in the top bar
// and a skeleton in the shape of the page — so the owner sees *which* page is coming and
// the arriving page replaces it without a jump. The page's real skeleton takes over for its
// data. Heights follow the rows and panels they stand in for (§6.16).
//
//   kind  "table"      a --card list: a header row and eight rows
//         "panels"     stacked panels, for a week, a form, a profile or Account
//         "dashboard"  the metric strip, a table, and two chart panels
//   size  the page's width name, as PageContainer takes it

function TableBlock({ rows = 8 }) {
  return (
    <div className="border border-hair bg-card" aria-hidden="true">
      <div className="flex h-[var(--head-h)] items-center gap-24 border-b border-hair2 bg-tint px-20">
        <Skeleton className="h-[10px] w-[12%] bg-tint2" />
        <Skeleton className="h-[10px] w-[8%] bg-tint2" />
        <Skeleton className="h-[10px] w-[16%] bg-tint2" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex h-[var(--row-h)] items-center gap-24 border-b border-hair px-20 last:border-b-0"
        >
          <Skeleton className="h-[14px] w-[22%]" />
          <Skeleton className="h-[14px] w-[10%]" />
          <Skeleton className="h-[14px] flex-1" />
          <Skeleton className="h-[22px] w-[90px]" />
        </div>
      ))}
    </div>
  );
}

function Body({ kind }) {
  if (kind === "dashboard") {
    return (
      <div className="flex flex-col gap-24" aria-hidden="true">
        <Skeleton className="h-[92px] w-full" />
        <TableBlock rows={5} />
        <div className="grid grid-cols-1 gap-24 min-[1200px]:grid-cols-2">
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[280px] w-full" />
        </div>
      </div>
    );
  }
  if (kind === "panels") {
    return (
      <div className="flex flex-col gap-24" aria-hidden="true">
        <Skeleton className="h-[92px] w-full" />
        <Skeleton className="h-[240px] w-full" />
        <Skeleton className="h-[160px] w-full" />
      </div>
    );
  }
  return <TableBlock />;
}

export function RouteFallback({ title, kind = "table", size = "page" }) {
  return (
    <>
      <PageHeader title={title} />
      <PageContainer size={size}>
        <div role="status" aria-label={`Loading ${title}`}>
          <Body kind={kind} />
        </div>
      </PageContainer>
    </>
  );
}

/** The auth screens' fallback (no shell): the form panel's skeleton, as LinkPreviewGate draws it. */
export function AuthFallback() {
  return (
    <div role="status" aria-label="Loading">
      <AuthPanel>
        <div className="flex flex-col gap-20" aria-hidden="true">
          <Skeleton className="h-[67px]" />
          <Skeleton className="h-[67px]" />
          <Skeleton className="h-[var(--ctrl-h-lg)]" />
        </div>
      </AuthPanel>
    </div>
  );
}
