import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { Combobox } from "../ui/Combobox.jsx";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";

// A work line's task (design §4.11, frontend_architecture.md §6.3): the person's open
// tasks grouped by project, then "Start a new task…", which expands inline into a
// task name and a project Select.
//
//   value     { kind: "existing", id } | { kind: "new", name, project } | null
//   options   [{ label: projectName, options: [{ value: taskId, label: taskName }] }]
//   projects  [{ _id, name }] for a new task
//   errors    the field errors under `task` — { message } or { name, project }

const NEW = "__new__";

export const TaskPicker = forwardRef(function TaskPicker(
  {
    value,
    onChange,
    onBlur,
    options,
    allowNew = true,
    projects = [],
    errors,
    className,
    ...inputProps
  },
  ref,
) {
  const isNew = value?.kind === "new";
  return (
    <div className={cn("flex min-w-0 flex-col gap-6", className)}>
      <Combobox
        ref={ref}
        value={isNew ? NEW : (value?.id ?? null)}
        groups={options}
        action={allowNew ? { value: NEW, label: "Start a new task…" } : null}
        placeholder="Choose a task"
        emptyText="No open tasks match."
        onBlur={onBlur}
        onChange={(next) =>
          onChange(
            next === NEW
              ? {
                  kind: "new",
                  name: "",
                  project: projects.length === 1 ? projects[0]._id : "",
                }
              : { kind: "existing", id: next },
          )
        }
        {...inputProps}
      />
      {isNew && (
        <div className="flex flex-col gap-6">
          <Input
            aria-label="New task name"
            placeholder="New task name"
            maxLength={200}
            autoFocus
            value={value.name}
            aria-invalid={errors?.name ? true : undefined}
            onChange={(event) =>
              onChange({ ...value, name: event.target.value })
            }
          />
          <Select
            aria-label="Project"
            placeholder="Project"
            value={value.project}
            aria-invalid={errors?.project ? true : undefined}
            options={projects.map((p) => ({ value: p._id, label: p.name }))}
            onChange={(event) =>
              onChange({ ...value, project: event.target.value })
            }
          />
        </div>
      )}
    </div>
  );
});
