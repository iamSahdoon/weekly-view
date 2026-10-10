import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  useCreateProject,
  useSetPlan,
  useUpdateProject,
} from "../../hooks/useProjectQueries.js";
import { useUsers } from "../../hooks/useUserQueries.js";
import { nextWeekday } from "../../lib/dates.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { reportServerError } from "../../lib/formErrors.js";
import {
  isBlankPlan,
  planSchema,
  projectSchema,
} from "../../schemas/projectSchema.js";
import { Button } from "../ui/Button.jsx";
import { Field } from "../ui/Field.jsx";
import { InlineError } from "../ui/InlineError.jsx";
import { Input } from "../ui/Input.jsx";
import { Modal } from "../ui/Modal.jsx";
import { MultiSelect } from "../ui/MultiSelect.jsx";
import { Textarea } from "../ui/Textarea.jsx";
import { EarlierPlans, PlanFields } from "./PlanModal.jsx";

// Create or edit a project (design §3.9): name, description, people, and the Plan group.
// Editing sends only what changed — P3 for the name, description and people, then P4 for
// the plan, each on its own — and the plans it replaced are listed beneath. Mount it
// when it opens (the form takes its values from `project` once).

const sameIds = (a, b) =>
  a.length === b.length && a.every((id) => b.includes(id));

export function ProjectModal({ project = null, open, onOpenChange }) {
  const editing = Boolean(project);
  const plan = project?.progress?.plan ?? null;
  const people = useUsers({ status: "active", limit: 100 });
  const create = useCreateProject();
  const update = useUpdateProject();
  const setPlan = useSetPlan();
  const pending = create.isPending || update.isPending || setPlan.isPending;

  const form = useForm({
    resolver: zodResolver(projectSchema),
    mode: "onTouched",
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      memberIds: project?.memberIds ?? [],
      plan: {
        startDate: plan?.startDate?.slice(0, 10) ?? nextWeekday(),
        plannedDays: plan ? String(plan.plannedDays) : "",
        plannedHours: plan?.plannedHours ? String(plan.plannedHours) : "",
      },
    },
  });
  const { errors } = form.formState;
  const memberOptions = (people.data?.items ?? []).map((u) => ({
    value: u._id,
    label: u.name,
  }));
  const formId = `project-${project?._id ?? "new"}`;

  const fail = (error) => reportServerError(form, error, errorCopy);
  const done = () => onOpenChange(false);

  const onSubmit = async (values) => {
    const newPlan = isBlankPlan(values.plan)
      ? null
      : planSchema.parse(values.plan);
    if (!editing) {
      create.mutate(
        {
          name: values.name,
          description: values.description,
          memberIds: values.memberIds,
          ...(newPlan ? { plan: newPlan } : {}),
        },
        { onSuccess: done, onError: fail },
      );
      return;
    }
    try {
      const body = {};
      if (values.name !== project.name) body.name = values.name;
      if (values.description !== (project.description ?? ""))
        body.description = values.description;
      if (!sameIds(values.memberIds, project.memberIds ?? []))
        body.memberIds = values.memberIds;
      if (Object.keys(body).length)
        await update.mutateAsync({ id: project._id, body });
      const planChanged =
        newPlan &&
        (!plan ||
          newPlan.startDate !== plan.startDate.slice(0, 10) ||
          newPlan.plannedDays !== plan.plannedDays ||
          newPlan.plannedHours !== (plan.plannedHours ?? null));
      if (planChanged)
        await setPlan.mutateAsync({ id: project._id, plan: newPlan });
      done();
    } catch (error) {
      fail(error);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={editing ? "Edit project" : "New project"}
      description={editing ? `Edit ${project.name}` : "Create a project"}
      dismissible={!pending}
      footer={
        <>
          <Button variant="secondary" disabled={pending} onClick={done}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {editing ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-20"
      >
        <Field label="Name" error={errors.name}>
          <Input autoComplete="off" {...form.register("name")} />
        </Field>
        <Field label="Description" optional error={errors.description}>
          <Textarea rows={2} {...form.register("description")} />
        </Field>
        <div className="flex flex-col gap-6">
          <span className="text-dense font-medium text-ink">People</span>
          <MultiSelect
            label="People"
            options={memberOptions}
            value={form.watch("memberIds")}
            onChange={(ids) =>
              form.setValue("memberIds", ids, { shouldDirty: true })
            }
            className="w-full"
          />
        </div>
        <fieldset className="flex flex-col gap-14 border-t border-hair pt-16">
          <legend className="pr-8 text-dense font-medium text-ink">Plan</legend>
          <PlanFields form={form} prefix="plan." />
        </fieldset>
        {errors.root?.server && (
          <InlineError title="The project wasn’t saved.">
            {errors.root.server.message}
          </InlineError>
        )}
        {editing && <EarlierPlans history={project.progress?.planHistory} />}
      </form>
    </Modal>
  );
}
