import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { useHolidaySet } from "../../hooks/useHolidayQueries.js";
import { useSetPlan } from "../../hooks/useProjectQueries.js";
import {
  addWorkingDays,
  holidaysWithin,
  nextWeekday,
  parseCalendarDate,
} from "../../lib/dates.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { reportServerError } from "../../lib/formErrors.js";
import { formatDate, formatDateLong, formatHours } from "../../lib/format.js";
import { planSchema } from "../../schemas/projectSchema.js";
import { Button } from "../ui/Button.jsx";
import { DatePicker } from "../ui/DatePicker.jsx";
import { Field } from "../ui/Field.jsx";
import { InlineError } from "../ui/InlineError.jsx";
import { Input } from "../ui/Input.jsx";
import { Modal } from "../ui/Modal.jsx";

// Set or extend a plan (design §3.9): the Plan group alone, current values filled in,
// a line naming the change ("From 20 to 25 working days."), the finish previewed with
// the team's holidays ("Ends Fri 16 Oct, skipping 1 holiday."), and the plans it
// replaced. The group (`PlanFields`) is also the create / edit modal's Plan section.
// P4 pushes the old plan onto the project's history on the server; this only asks.

// Under Planned hours, in both modals (owner, C8): what the number is and what it is read
// against — the project's hours logged, shown by the Days | Hours control.
const HOURS_HINT =
  "Optional. Total hours for the whole project, all people combined. Compared with the hours logged.";

// "Ends Fri 16 Oct, skipping 1 holiday." Nothing until the three inputs make a date.
function FinishLine({ startDate, plannedDays }) {
  const days = Number(plannedDays);
  const holidays = useHolidaySet(startDate, days);
  const start = startDate ? parseCalendarDate(startDate) : null;
  if (!start || !Number.isInteger(days) || days < 1) return null;
  if (!holidays.data) return <p className="text-caption text-mut">&nbsp;</p>;
  const end = addWorkingDays(start, days, holidays.data);
  if (!end) return null;
  const skipped = holidaysWithin(start, end, holidays.data);
  return (
    <p className="text-caption text-mut" data-testid="plan-finish">
      Ends {format(end, "EEE d MMM")}
      {skipped > 0
        ? `, skipping ${skipped} ${skipped === 1 ? "holiday" : "holidays"}.`
        : "."}
    </p>
  );
}

/** The Plan group: start date, planned working days, planned hours, and the finish. */
export function PlanFields({ form, prefix = "" }) {
  const name = (field) => `${prefix}${field}`;
  const errors = prefix
    ? (form.formState.errors.plan ?? {})
    : form.formState.errors;
  const startDate = form.watch(name("startDate"));
  const plannedDays = form.watch(name("plannedDays"));
  return (
    <div className="flex flex-col gap-14">
      <Field label="Start date" error={errors.startDate}>
        <Controller
          control={form.control}
          name={name("startDate")}
          render={({ field }) => (
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
      </Field>
      <Field label="Working days" error={errors.plannedDays}>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          {...form.register(name("plannedDays"))}
        />
      </Field>
      <Field
        label="Planned hours"
        helper={HOURS_HINT}
        error={errors.plannedHours}
      >
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          {...form.register(name("plannedHours"))}
        />
      </Field>
      <FinishLine startDate={startDate} plannedDays={plannedDays} />
    </div>
  );
}

/** "20 working days from 1 Sep 2026 · 160 h" with who changed it and when. */
export function EarlierPlans({ history }) {
  if (!history?.length) return null;
  return (
    <section aria-label="Earlier plans" className="flex flex-col gap-6">
      <h3 className="text-dense font-medium text-ink">Earlier plans</h3>
      <ul className="flex flex-col gap-4 text-caption text-mut">
        {[...history].reverse().map((plan, i) => (
          <li key={`${plan.changedAt}-${i}`}>
            {plan.plannedDays} working days from{" "}
            <span className="font-mono">{formatDateLong(plan.startDate)}</span>
            {plan.plannedHours ? (
              <>
                {" "}
                ·{" "}
                <span className="font-mono">
                  {formatHours(plan.plannedHours)} h
                </span>
              </>
            ) : null}
            {" — replaced "}
            <span className="font-mono">{formatDate(plan.changedAt)}</span>
            {plan.changedBy ? ` by ${plan.changedBy.name}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlanModal({ project, open, onOpenChange }) {
  const current = project?.progress?.plan ?? null;
  const setPlan = useSetPlan();
  const form = useForm({
    resolver: zodResolver(planSchema),
    mode: "onTouched",
    defaultValues: {
      startDate: current?.startDate?.slice(0, 10) ?? nextWeekday(),
      plannedDays: current ? String(current.plannedDays) : "",
      plannedHours: current?.plannedHours ? String(current.plannedHours) : "",
    },
  });
  const days = Number(form.watch("plannedDays"));
  const changed =
    current &&
    Number.isInteger(days) &&
    days > 0 &&
    days !== current.plannedDays;
  const formId = `plan-${project?._id}`;

  const submit = form.handleSubmit((plan) =>
    setPlan.mutate(
      { id: project._id, plan },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => reportServerError(form, error, errorCopy),
      },
    ),
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={current ? "Extend plan" : "Set plan"}
      description={`The plan for ${project?.name}`}
      dismissible={!setPlan.isPending}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={setPlan.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={setPlan.isPending}>
            {current ? "Save plan" : "Set plan"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-14"
      >
        <p className="text-base text-body">{project?.name}</p>
        {changed && (
          <p className="text-dense text-ink">
            From {current.plannedDays} to {days} working days.
          </p>
        )}
        <PlanFields form={form} />
        {form.formState.errors.root?.server && (
          <InlineError title="The plan wasn’t saved.">
            {form.formState.errors.root.server.message}
          </InlineError>
        )}
        <EarlierPlans history={project?.progress?.planHistory} />
      </form>
    </Modal>
  );
}
