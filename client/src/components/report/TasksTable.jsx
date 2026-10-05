import { Link } from "react-router-dom";
import { WEEKDAY_SHORT } from "../../lib/constants.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { TaskCard } from "./TaskCard.jsx";
import { TaskRow } from "./TaskRow.jsx";

// Section 01 (design §4.3): every task the week's lines name, in the order they first
// appear, from the server — never typed here, no add or remove. Each takes a required
// status and an optional note, held in the form's `taskStates` by task id, so a refetch
// that adds a task adds a row and changes nothing else (frontend_architecture.md §6.2).
// TaskRow from 768px, TaskCard below.

export function TasksTable({ tasks, form, weekKey, postedDays }) {
  const wide = useMediaQuery("(min-width: 768px)");
  const Row = wide ? TaskRow : TaskCard;
  return (
    <>
      <ul className={wide ? "flex flex-col" : "flex flex-col gap-11"}>
        {tasks.map((task) => (
          <Row key={task.task._id} form={form} task={task} />
        ))}
      </ul>
      <p className="text-caption text-mut">
        Tasks come from your daily updates. To add or change one, edit that day.{" "}
        <span className="inline-flex flex-wrap gap-x-8">
          {postedDays.map((day) => (
            <Link
              key={day}
              to={`/?week=${weekKey}&day=${day}`}
              className="text-acc-txt underline-offset-2 hover:underline"
            >
              {WEEKDAY_SHORT[day]} ›
            </Link>
          ))}
        </span>
      </p>
    </>
  );
}
