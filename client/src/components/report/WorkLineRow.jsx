import { CircleAlert, X } from "lucide-react";
import { useId } from "react";
import { Controller, useFormState, useWatch } from "react-hook-form";
import {
  TASK_TYPES,
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
} from "../../lib/constants.js";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";
import { TaskPicker } from "./TaskPicker.jsx";

// One work line (design §4.11): task · type · what I did · hours, in a row at
// ≥768px (240 · 180 · the rest · 90). Below 768px it stacks: task, then type and hours
// two-up, then the text. A field-array row: it reads its own slice of the form, so
// typing in one line doesn't re-render its siblings. Errors show beneath the line.
//
//   canRemove  false on the last line, whose button clears it instead

const TYPE_OPTIONS = TASK_TYPES.map((t) => ({
  value: t,
  label: TASK_TYPE_LABELS[t],
}));

function taskErrors(error) {
  if (!error) return [];
  if (error.message) return [error.message];
  return [error.name?.message, error.project?.message].filter(Boolean);
}

export function WorkLineRow({
  index,
  form,
  taskOptions,
  projects,
  onRemove,
  canRemove,
  ...rowProps
}) {
  const id = useId();
  const { control, register } = form;
  const name = (field) => `lines.${index}.${field}`;
  const { errors } = useFormState({ control, name: `lines.${index}` });
  const lineErrors = errors.lines?.[index];
  const taskType = useWatch({ control, name: name("taskType") });

  const messages = [
    ["task", taskErrors(lineErrors?.task)],
    ["taskType", [lineErrors?.taskType?.message].filter(Boolean)],
    ["text", [lineErrors?.text?.message].filter(Boolean)],
    ["hours", [lineErrors?.hours?.message].filter(Boolean)],
  ].filter(([, list]) => list.length > 0);
  const errorId = (field) => `${id}-${field}-error`;
  const describe = (field) =>
    messages.some(([f]) => f === field) ? errorId(field) : undefined;
  const invalid = (field) => (describe(field) ? true : undefined);

  return (
    <li
      className="flex flex-col gap-6 border-b border-hair pb-11 md:border-b-0 md:pb-0"
      data-tour={index === 0 ? "work-line" : undefined}
      {...rowProps}
    >
      <div className="grid grid-cols-2 gap-8 md:grid-cols-[240px_180px_minmax(0,1fr)_90px_var(--ctrl-h)]">
        <Controller
          control={control}
          name={name("task")}
          render={({ field }) => (
            <TaskPicker
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={taskOptions}
              projects={projects}
              errors={lineErrors?.task}
              aria-label={`Task, line ${index + 1}`}
              aria-invalid={invalid("task")}
              aria-describedby={describe("task")}
              className="col-span-2 md:col-span-1"
            />
          )}
        />
        <div className="relative min-w-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-[12px] z-[1] h-[12px] w-[4px] -translate-y-1/2"
            style={{
              background: taskType
                ? TASK_TYPE_COLORS[taskType]
                : "var(--hair2)",
            }}
          />
          <Select
            aria-label={`Task type, line ${index + 1}`}
            placeholder="Type"
            options={TYPE_OPTIONS}
            aria-invalid={invalid("taskType")}
            aria-describedby={describe("taskType")}
            className="[&_select]:pl-[24px]"
            {...register(name("taskType"))}
          />
        </div>
        <Input
          aria-label={`What you did, line ${index + 1}`}
          placeholder="What I did"
          maxLength={500}
          aria-invalid={invalid("text")}
          aria-describedby={describe("text")}
          className="col-span-2 max-md:order-last md:col-span-1"
          {...register(name("text"))}
        />
        <Input
          type="number"
          inputMode="decimal"
          step="0.25"
          min="0.25"
          aria-label={`Hours, line ${index + 1}`}
          placeholder="Hours"
          aria-invalid={invalid("hours")}
          aria-describedby={describe("hours")}
          className="font-mono"
          {...register(name("hours"))}
        />
        <Button
          variant="ghost"
          iconOnly
          aria-label={
            canRemove ? `Remove line ${index + 1}` : "Clear this line"
          }
          onClick={onRemove}
          className="max-md:hidden"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {messages.length > 0 && (
        <ul className="flex flex-col gap-2">
          {messages.flatMap(([field, list]) =>
            list.map((message, i) => (
              <li
                key={`${field}-${i}`}
                id={i === 0 ? errorId(field) : undefined}
                className="flex items-center gap-4 text-caption text-st-corr-fg motion-safe:animate-[wv-fade-in_120ms_linear]"
              >
                <CircleAlert
                  aria-hidden="true"
                  className="size-[12px] shrink-0"
                />
                {message}
              </li>
            )),
          )}
        </ul>
      )}
      <div className="md:hidden">
        <Button size="sm" variant="ghost" onClick={onRemove}>
          {canRemove ? "Remove line" : "Clear line"}
        </Button>
      </div>
    </li>
  );
}
