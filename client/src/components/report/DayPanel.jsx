import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { draftKey, useDayDrafts } from "../../context/DayDraftsContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useProjects } from "../../hooks/useProjectQueries.js";
import { usePutDay } from "../../hooks/useReportQueries.js";
import { useMyTasks } from "../../hooks/useTaskQueries.js";
import { useUnsavedGuard } from "../../hooks/useUnsavedGuard.js";
import { WEEKDAY_LABELS } from "../../lib/constants.js";
import { weekDays } from "../../lib/dates.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { reportServerError } from "../../lib/formErrors.js";
import { formatHours, formatTime } from "../../lib/format.js";
import { qk } from "../../lib/queryKeys.js";
import {
  blankDay,
  blankLine,
  dayServerFields,
  dayToForm,
  daySchema,
  formToDayBody,
} from "../../schemas/reportSchema.js";
import { Button } from "../ui/Button.jsx";
import { Checkbox } from "../ui/Checkbox.jsx";
import { Input } from "../ui/Input.jsx";
import { PostedUpdate } from "./DailyUpdatesBlock.jsx";
import { WorkLineRow } from "./WorkLineRow.jsx";

// The day panel (design §4.11, frontend_architecture.md §6.3): the selected day of
// This week — a composer, the posted update, or the reason there is nothing to write.
// Which one is decided from `dayStates` and the report's status, never from a failed
// request. Owns `usePutDay` and the draft store. The page keys it by week and day, so
// switching days unmounts the composer, which first writes its values to the drafts.
// It never autosaves: posting is the act that shares (design §4.8).

const OPEN = ["draft", "needs_correction"];
const MAX_LINES = 20;
const MAX_BLOCKERS = 10;

const BLOCKED_LINES = {
  holiday: "Holiday — no update needed.",
  leave: "You were on leave.",
  future: "This day hasn’t happened yet.",
  not_on_team: "You weren’t on the team yet.",
};

export function DayPanel({ week, weekday, isOwn }) {
  const drafts = useDayDrafts();
  const key = draftKey(week.weekKey, weekday);
  const day = week.report?.days.find((d) => d.weekday === weekday) ?? null;
  const state = week.dayStates[weekday];
  const status = week.report?.status;
  const weekOpen = !status || OPEN.includes(status);
  const writable =
    isOwn && weekOpen && ["posted", "missing", "today"].includes(state);
  // A day with a draft opens in the composer, even when it is posted (§6.3).
  const [editing, setEditing] = useState(() => drafts.has(key));
  const date = weekDays(week.weekKey).find((d) => d.weekday === weekday).date;

  if (writable && (!day || editing)) {
    return (
      <DayComposer
        week={week}
        weekday={weekday}
        date={date}
        day={day}
        missing={state === "missing"}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <section
      aria-labelledby={`day-${weekday}`}
      className="border border-hair bg-card"
    >
      <DayHeader
        id={`day-${weekday}`}
        date={date}
        hours={day?.hours}
        meta={
          day && (
            <>
              <span className="font-mono text-micro text-mut">
                Posted {formatTime(day.postedAt)}
                {day.editedAt && " · edited"}
              </span>
              {writable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              )}
            </>
          )
        }
      />
      <div className="px-20 py-16">
        {day ? (
          <PostedUpdate week={week} day={day} />
        ) : (
          <p className="text-dense text-body">
            {BLOCKED_LINES[state] ??
              (weekOpen
                ? "Nothing posted for this day."
                : "No update was posted for this day.")}
          </p>
        )}
      </div>
    </section>
  );
}

function DayHeader({ id, date, hours, meta }) {
  return (
    <header className="flex min-h-44 flex-wrap items-center justify-between gap-x-20 gap-y-4 border-b border-hair px-20 py-6">
      <h2 id={id} className="font-display text-panel font-bold text-ink">
        {format(date, "EEE d MMM")}
      </h2>
      <div className="flex items-center gap-14">
        {hours != null && (
          <span className="font-mono text-dense text-ink">
            {formatHours(hours)} h
          </span>
        )}
        {meta}
      </div>
    </header>
  );
}

// ------------------------------------------------------------------ the composer

function groupTasks(items) {
  const groups = new Map();
  for (const task of items) {
    const label = task.project?.name ?? "No project";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push({ value: task._id, label: task.name });
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, options]) => ({
      label,
      options: options.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}

const REASONS = {
  future: "That day hasn’t happened yet.",
  holiday: "That day is a holiday — no update is needed.",
  leave: "You’re on leave that day — no update is needed.",
};

function DayComposer({ week, weekday, date, day, missing, onDone }) {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const drafts = useDayDrafts();
  const key = draftKey(week.weekKey, weekday);
  const putDay = usePutDay();

  const [initial] = useState(() => drafts.get(key));
  const form = useForm({
    resolver: zodResolver(daySchema),
    // Design §4.10: on blur first, then on every change once a field has been touched.
    mode: "onTouched",
    defaultValues: initial?.values ?? (day ? dayToForm(day) : blankDay()),
  });
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const blockers = useFieldArray({ control: form.control, name: "blockers" });
  const { isDirty, errors } = form.formState;

  // Text carried over a day switch is kept but not "saved" until Save is pressed.
  const [fromUnsaved, setFromUnsaved] = useState(
    Boolean(initial && !initial.saved),
  );
  const [savedNote, setSavedNote] = useState(Boolean(initial?.saved));
  useUnsavedGuard(isDirty || fromUnsaved);

  // Switching days unmounts the composer: what it holds goes to the drafts first.
  const latest = useRef({ isDirty, fromUnsaved, posted: false });
  latest.current = { ...latest.current, isDirty, fromUnsaved };
  useEffect(
    () => () => {
      const { isDirty: dirty, fromUnsaved: carried, posted } = latest.current;
      if (!posted && (dirty || carried)) {
        drafts.set(key, form.getValues(), { saved: false });
      }
    },
    [drafts, key, form],
  );

  // The picker: open tasks, plus any task already on a line here (one since marked
  // Done must still show its name).
  const tasks = useMyTasks();
  const taskOptions = useMemo(() => {
    const items = [...(tasks.data?.items ?? [])];
    for (const line of day?.lines ?? []) {
      if (line.task && !items.some((t) => t._id === line.task._id)) {
        items.push(line.task);
      }
    }
    return groupTasks(items);
  }, [tasks.data, day]);
  // A new task goes on one of the person's projects, else any active project.
  const mine = useProjects({ mine: true });
  const noneMine = mine.isSuccess && mine.data.items.length === 0;
  const active = useProjects({ status: "active" }, { enabled: noneMine });
  const projects = (noneMine ? active.data?.items : mine.data?.items) ?? [];

  const watchedLines = useWatch({ control: form.control, name: "lines" });
  const total = (watchedLines ?? []).reduce((sum, l) => {
    const n = Number(l?.hours);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);

  const refetchWeek = () =>
    queryClient.invalidateQueries({ queryKey: qk.week(me._id, week.weekKey) });

  const onPost = form.handleSubmit(async (values) => {
    try {
      await putDay.mutateAsync({
        weekKey: week.weekKey,
        weekday,
        body: formToDayBody(values),
      });
    } catch (error) {
      handleFailure(error);
      return;
    }
    latest.current.posted = true;
    drafts.remove(key);
    onDone();
  });

  function handleFailure(error) {
    const root = (message) =>
      form.setError("root.server", { type: "server", message });
    switch (error.code) {
      case "VALIDATION_FAILED":
        reportServerError(form, dayServerFields(error), errorCopy);
        return;
      case "DAY_NOT_EXPECTED":
        root(REASONS[error.details?.reason] ?? errorCopy(error));
        refetchWeek();
        return;
      case "WEEK_OUT_OF_RANGE":
        root(errorCopy(error));
        refetchWeek();
        return;
      case "REPORT_STATE_CHANGED":
        root(
          error.details?.status
            ? `This report changed while you were working — it is now ${error.details.status.replace("_", " ")}.`
            : errorCopy(error),
        );
        refetchWeek();
        return;
      case "TASK_NOT_FOUND":
        root("One of these tasks no longer exists. Choose another.");
        queryClient.invalidateQueries({ queryKey: qk.all.tasks() });
        return;
      case "PROJECT_INACTIVE": {
        const index = form
          .getValues("lines")
          .findIndex((l) => l.task?.kind === "new");
        if (index >= 0) {
          form.setError(`lines.${index}.task.project`, {
            type: "server",
            message: errorCopy(error),
          });
        } else root(errorCopy(error));
        queryClient.invalidateQueries({ queryKey: qk.all.projects() });
        return;
      }
      default:
        root(errorCopy(error));
    }
  }

  const onSave = () => {
    const values = form.getValues();
    drafts.set(key, values, { saved: true });
    form.reset(values);
    setFromUnsaved(false);
    setSavedNote(true);
  };

  const onCancel = () => {
    latest.current.posted = true; // nothing to keep
    drafts.remove(key);
    onDone();
  };

  const removeLine = (index) => {
    if (lines.fields.length > 1) lines.remove(index);
    else lines.update(0, blankLine());
  };

  return (
    <section
      aria-labelledby={`day-${weekday}`}
      className="border border-hair bg-card"
    >
      <DayHeader
        id={`day-${weekday}`}
        date={date}
        hours={total}
        meta={
          <span className="font-mono text-micro text-mut">
            {day
              ? `Posted ${formatTime(day.postedAt)}${day.editedAt ? " · edited" : ""}`
              : savedNote && !isDirty
                ? "Saved, not posted"
                : "Not posted"}
          </span>
        }
      />
      <form
        noValidate
        onSubmit={onPost}
        className="flex flex-col gap-20 px-20 py-16"
      >
        <fieldset disabled={putDay.isPending} className="flex flex-col gap-20">
          {missing && (
            <p className="text-dense text-body">
              {WEEKDAY_LABELS[weekday]}’s update is missing — your report can’t
              be submitted without it.
            </p>
          )}

          <div className="flex flex-col gap-8">
            <h3 className="text-dense font-medium text-ink">
              What did you do?
            </h3>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[240px_180px_minmax(0,1fr)_90px_var(--ctrl-h)] gap-8 text-micro font-medium text-mut md:grid"
            >
              <span>Task</span>
              <span>Type</span>
              <span>What I did</span>
              <span className="text-right">Hours</span>
            </div>
            <ol className="flex flex-col gap-11 md:gap-8">
              {lines.fields.map((field, index) => (
                <WorkLineRow
                  key={field.id}
                  index={index}
                  form={form}
                  taskOptions={taskOptions}
                  projects={projects}
                  canRemove={lines.fields.length > 1}
                  onRemove={() => removeLine(index)}
                />
              ))}
            </ol>
            {lines.fields.length < MAX_LINES && (
              <DashedButton onClick={() => lines.append(blankLine())}>
                Add a line
              </DashedButton>
            )}
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex items-baseline justify-between gap-8">
              <h3 className="text-dense font-medium text-ink">Blockers</h3>
              <span className="text-micro text-mut">Optional</span>
            </div>
            {blockers.fields.length > 0 && (
              <ul className="flex flex-col gap-8">
                {blockers.fields.map((field, index) => (
                  <li key={field.id} className="flex items-center gap-8">
                    <Input
                      aria-label={`Blocker ${index + 1}`}
                      placeholder="What is holding work up?"
                      maxLength={500}
                      autoFocus={
                        !field._id && index === blockers.fields.length - 1
                      }
                      {...form.register(`blockers.${index}.text`)}
                    />
                    <Button
                      variant="ghost"
                      iconOnly
                      aria-label={`Remove blocker ${index + 1}`}
                      onClick={() => blockers.remove(index)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {blockers.fields.length < MAX_BLOCKERS && (
              <DashedButton onClick={() => blockers.append({ text: "" })}>
                Add a blocker
              </DashedButton>
            )}
          </div>

          {errors.root?.server && (
            <p role="alert" className="text-dense text-st-corr-fg">
              {errors.root.server.message}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-20 gap-y-11">
            <Checkbox
              label="Open to team comments"
              {...form.register("openToTeam")}
            />
            <div className="flex flex-wrap items-center gap-8">
              {day && (
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button variant="secondary" onClick={onSave}>
                Save
              </Button>
              <Button type="submit" loading={putDay.isPending}>
                Post update
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </section>
  );
}

// The §4.3 dashed add button, 38px.
function DashedButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-halo flex h-[var(--ctrl-h)] w-full items-center justify-center gap-6 border border-dashed border-rule text-dense text-body transition-colors duration-[120ms] ease-linear hover:border-hair2 hover:bg-tint hover:text-ink max-md:h-[var(--ctrl-h-lg)]"
    >
      <Plus aria-hidden="true" className="size-[12px]" />
      {children}
    </button>
  );
}
