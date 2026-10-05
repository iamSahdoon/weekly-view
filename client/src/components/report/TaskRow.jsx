import { Controller } from "react-hook-form";
import { TASK_STATUSES } from "../../lib/constants.js";
import { cn } from "../../lib/cn.js";
import { formatHours } from "../../lib/format.js";
import { statusOf } from "../../lib/statusMaps.js";
import { Field } from "../ui/Field.jsx";
import { inputClasses } from "../ui/inputClasses.js";
import { Select } from "../ui/Select.jsx";

// One task of section 01 (design §4.3), 768px and up: name (13/500 --ink), project
// (13 --body), this week's hours in mono, and the required status Select at 140px; the
// optional note beneath. TaskCard is the narrow form of the same row (§4.4), and shares
// the two fields below.
//
// The fields are Controllers with an empty default, so a task that a refetch adds
// starts with no status — never the Select's first option (§6.2: no default status).

const STATUS_OPTIONS = TASK_STATUSES.map((value) => ({
  value,
  label: statusOf("task", value).label,
}));

export function TaskStatusField({ form, task, className }) {
  const id = task.task._id;
  return (
    <Controller
      control={form.control}
      name={`taskStates.${id}.status`}
      defaultValue=""
      render={({ field, fieldState }) => (
        <Field error={fieldState.error} className={className}>
          <Select
            {...field}
            value={field.value ?? ""}
            // A Select a blocked submit marked re-validates on every change (§4.10).
            onChange={(event) => {
              field.onChange(event);
              if (fieldState.error) void form.trigger(field.name);
            }}
            data-task-status={id}
            aria-label={`Status of ${task.task.name}`}
            placeholder="Set status"
            options={STATUS_OPTIONS}
          />
        </Field>
      )}
    />
  );
}

export function TaskNoteField({ form, task }) {
  const id = task.task._id;
  return (
    <Controller
      control={form.control}
      name={`taskStates.${id}.note`}
      defaultValue=""
      render={({ field, fieldState }) => (
        <Field label="Note" optional error={fieldState.error}>
          {/* One line until focused, then three rows (§4.3). */}
          <textarea
            {...field}
            value={field.value ?? ""}
            rows={1}
            maxLength={2000}
            className={cn(
              inputClasses,
              "h-[var(--ctrl-h)] resize-none py-[8px] leading-[1.45] focus:h-[86px] max-md:h-[var(--ctrl-h-lg)] max-md:py-[10px] max-md:focus:h-[92px]",
            )}
          />
        </Field>
      )}
    />
  );
}

export function TaskName({ task }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-dense font-medium break-words text-ink">
        {task.task.name}
      </span>
      <span className="text-dense break-words text-body">
        {task.task.project?.name}
      </span>
    </div>
  );
}

export function TaskHours({ task }) {
  return (
    <span className="font-mono text-dense whitespace-nowrap text-ink tabular-nums">
      {formatHours(task.hours)} h
    </span>
  );
}

export function TaskRow({ form, task }) {
  return (
    <li className="flex flex-col gap-11 border-b border-hair py-14 first:pt-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_140px] items-start gap-x-20">
        <TaskName task={task} />
        <span className="flex h-[var(--ctrl-h)] items-center">
          <TaskHours task={task} />
        </span>
        <TaskStatusField form={form} task={task} />
      </div>
      <div className="max-w-[560px]">
        <TaskNoteField form={form} task={task} />
      </div>
    </li>
  );
}
