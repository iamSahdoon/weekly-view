import {
  TaskHours,
  TaskName,
  TaskNoteField,
  TaskStatusField,
} from "./TaskRow.jsx";

// A task below 768px (design §4.4): a --card with a 1px --hair border and 16px padding;
// name and project on line one, hours right; the status Select full width at 44px; the
// note beneath. Inputs are 44px with 16px type, so iOS does not zoom on focus.

export function TaskCard({ form, task }) {
  return (
    <li className="flex flex-col gap-11 border border-hair bg-card p-16">
      <div className="flex items-start justify-between gap-11">
        <TaskName task={task} />
        <TaskHours task={task} />
      </div>
      <TaskStatusField form={form} task={task} />
      <TaskNoteField form={form} task={task} />
    </li>
  );
}
