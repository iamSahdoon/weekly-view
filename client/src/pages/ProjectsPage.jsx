import { useState } from "react";
import { PlanModal } from "../components/project/PlanModal.jsx";
import { ProjectModal } from "../components/project/ProjectModal.jsx";
import { ProjectsListTable } from "../components/project/ProjectsListTable.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import {
  useDeactivateProject,
  useProjects,
} from "../hooks/useProjectQueries.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import { useUsers } from "../hooks/useUserQueries.js";
import { errorCopy } from "../lib/errorCopy.js";
import { enumParam } from "../lib/urlParams.js";

// Projects — /projects (design §3.9, frontend_architecture.md §9.11). A short list, so a
// table and no filter bar; the only thing in the URL is the Days | Hours choice. New and
// edit are one modal, Extend plan its own, Delete a confirm that names the real task count
// and deactivates (the project leaves the pickers; past weeks keep its name).

const SPEC = { unit: enumParam(["days", "hours"], "days") };

const tasksSentence = (n) =>
  n === 0
    ? "No tasks belong to it."
    : `${n} ${n === 1 ? "task belongs" : "tasks belong"} to it.`;

export default function ProjectsPage() {
  const { filters, setFilter } = useUrlFilters(SPEC);
  const projects = useProjects({ status: "active" });
  const people = useUsers({ status: "active", limit: 100 });
  const deactivate = useDeactivateProject();
  // One open dialog at a time: { kind: "form" | "plan" | "delete", project? }.
  const [dialog, setDialog] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const peopleById = new Map((people.data?.items ?? []).map((u) => [u._id, u]));
  const close = () => {
    setDialog(null);
    setDeleteError(null);
  };
  const open = (kind) => (project) => setDialog({ kind, project });

  const confirmDelete = () =>
    deactivate.mutate(dialog.project._id, {
      onSuccess: close,
      onError: (error) => setDeleteError(errorCopy(error)),
    });

  return (
    <>
      <PageHeader
        title="Projects"
        primary={
          <Button onClick={() => setDialog({ kind: "form" })}>
            New project
          </Button>
        }
      />
      <PageContainer>
        <p className="mb-20 text-base text-body">
          What the team’s work belongs to, and how each project is tracking.
        </p>
        <QueryView
          query={projects}
          skeleton={
            <ProjectsListTable
              rows={[]}
              isLoading
              unit={filters.unit}
              onUnitChange={() => {}}
              peopleById={peopleById}
            />
          }
          error={
            <InlineError
              title="The projects didn’t load."
              onRetry={() => projects.refetch()}
            >
              Check your connection and try again.
            </InlineError>
          }
          isEmpty={(data) => data.items.length === 0}
          empty={
            <div className="border border-hair bg-card">
              <EmptyState
                title="No projects yet."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => setDialog({ kind: "form" })}
                  >
                    New project
                  </Button>
                }
              >
                Projects are what the team’s tasks and hours belong to.
              </EmptyState>
            </div>
          }
        >
          {(data) => (
            <ProjectsListTable
              rows={data.items}
              peopleById={peopleById}
              unit={filters.unit}
              onUnitChange={(unit) => setFilter("unit", unit)}
              onEdit={open("form")}
              onPlan={open("plan")}
              onDelete={open("delete")}
            />
          )}
        </QueryView>
      </PageContainer>

      {dialog?.kind === "form" && (
        <ProjectModal
          project={dialog.project ?? null}
          open
          onOpenChange={(next) => !next && close()}
        />
      )}
      {dialog?.kind === "plan" && (
        <PlanModal
          project={dialog.project}
          open
          onOpenChange={(next) => !next && close()}
        />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && close()}
          title={`Delete “${dialog.project.name}”?`}
          confirmLabel="Delete project"
          onConfirm={confirmDelete}
          pending={deactivate.isPending}
        >
          <p>
            {tasksSentence(dialog.project.taskCount ?? 0)} Their hours stay in
            past weeks; the project stops being available for new tasks.
          </p>
          {deleteError && (
            <p role="alert" className="mt-11 text-dense text-st-corr-fg">
              {deleteError}
            </p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
