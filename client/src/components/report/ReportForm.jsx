import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useFieldArray,
  useForm,
  useFormState,
  useWatch,
} from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAppendMotion } from "../../hooks/useAppendMotion.js";
import { useActiveSection } from "../../hooks/useActiveSection.js";
import { useAutosave } from "../../hooks/useAutosave.js";
import { useHolidaysForWeek } from "../../hooks/useHolidayQueries.js";
import {
  useSaveContent,
  useSubmitReport,
} from "../../hooks/useReportQueries.js";
import { useUnsavedGuard } from "../../hooks/useUnsavedGuard.js";
import { cn } from "../../lib/cn.js";
import { WEEKDAYS, WEEKDAY_SHORT } from "../../lib/constants.js";
import { weekNumberLabel } from "../../lib/dates.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { toastError } from "../../lib/errorToast.js";
import { formatWeekRange } from "../../lib/format.js";
import { invalidateWeek } from "../../lib/invalidateWeek.js";
import { statusOf } from "../../lib/statusMaps.js";
import { submitChecklist } from "../../lib/submitChecklist.js";
import {
  LIST_MAX,
  blankAchievement,
  blankItem,
  blankLink,
  reportToForm,
  submitServerFields,
  toContentPayload,
  weeklySchema,
} from "../../schemas/reportSchema.js";
import { Button } from "../ui/Button.jsx";
import { Field } from "../ui/Field.jsx";
import { Input } from "../ui/Input.jsx";
import { Textarea } from "../ui/Textarea.jsx";
import { CorrectionPanel } from "./CorrectionPanel.jsx";
import { FormSection } from "./FormSection.jsx";
import { HoursByTypeGrid } from "./HoursByTypeGrid.jsx";
import { KeyFlag } from "./KeyFlag.jsx";
import { SectionRail } from "./SectionRail.jsx";
import { StickyActionBar } from "./StickyActionBar.jsx";
import { TasksTable } from "./TasksTable.jsx";
import { WeekStrip } from "./WeekStrip.jsx";

// The end-of-week form (design §4, frontend_architecture.md §6.4). One scroll, six
// numbered sections and a sticky rail; it owns RHF, the autosave and the submit.
//
// Initial values come from the week once, when the form mounts — the page keys it by
// the report and its status — and never again: a refetch or an autosave response goes
// into the cache and the form keeps what the person typed (§6.2). The task rows are
// rendered from `week.report.tasks`; only their status and note are form values.

const SECTIONS = [
  { id: "form-tasks", number: "01", title: "Tasks" },
  { id: "form-next-week", number: "02", title: "Planned for next week" },
  { id: "form-blockers", number: "03", title: "Blockers & challenges" },
  { id: "form-achievements", number: "04", title: "Achievements" },
  { id: "form-hours", number: "05", title: "Hours by task type" },
  { id: "form-notes", number: "06", title: "Notes & links" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);
const SUMMARY_ID = "form-week";
const PROBLEM_TOP = 140;

const filled = (rows, key = "text") =>
  (rows ?? []).some((r) => (r?.[key] ?? "").trim().length > 0);

/** Scroll a problem to 140px from the top, and focus it (design §4.10). */
function revealElement(node) {
  if (!node) return;
  const reduce = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  )?.matches;
  window.scrollTo({
    top: node.getBoundingClientRect().top + window.scrollY - PROBLEM_TOP,
    behavior: reduce ? "auto" : "smooth",
  });
  node.focus({ preventScroll: true });
}

export function ReportForm({ week }) {
  const report = week.report;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const holidays = useHolidaysForWeek(week.weekKey);

  const [defaultValues] = useState(() => reportToForm(report));
  const form = useForm({
    defaultValues,
    resolver: zodResolver(weeklySchema),
    mode: "onTouched",
  });
  const values = useWatch({ control: form.control });
  const { errors } = useFormState({ control: form.control });

  // The autosave reads the latest values and the latest server task list when it runs.
  const latestReport = useRef(report);
  useEffect(() => {
    latestReport.current = report;
  });
  const saveContent = useSaveContent();
  const autosave = useAutosave({
    savedAt: report.updatedAt,
    save: async () => {
      const view = await saveContent.mutateAsync({
        reportId: report._id,
        body: toContentPayload(form.getValues(), latestReport.current),
      });
      return { savedAt: view.report?.updatedAt ?? new Date().toISOString() };
    },
  });
  const { touch, flush } = autosave;
  useEffect(() => {
    const subscription = form.watch(() => touch());
    return () => subscription.unsubscribe();
  }, [form, touch]);

  // A failed save blocks leaving; a pending one is saved by the unmount flush, so it
  // only arms the tab-close prompt (§6.4 Guards).
  useUnsavedGuard(autosave.state === "failed");
  useUnsavedGuard(autosave.state === "pending" || autosave.state === "saving", {
    keepsOnNavigate: true,
  });

  // ---------------------------------------------------------------- submit
  const submitReport = useSubmitReport();
  const checklist = submitChecklist(week, values.taskStates);
  const [dayError, setDayError] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const revealProblems = (days, taskIds) => {
    if (days.length > 0) setDayError(true);
    taskIds.forEach((id) =>
      form.setError(
        `taskStates.${id}.status`,
        { type: "required", message: "Choose a status." },
        { shouldFocus: false },
      ),
    );
    if (days.length > 0) {
      const index = WEEKDAYS.indexOf(days[0]);
      revealElement(
        document.querySelectorAll(`#${SUMMARY_ID} [role="tab"]`)[index],
      );
    } else if (taskIds.length > 0) {
      revealElement(
        document.querySelector(`[data-task-status="${taskIds[0]}"]`),
      );
    }
  };

  const onSubmit = async ({ requestApproval }) => {
    setSubmitError(null);
    if (submitReport.isPending) return;
    if (!checklist.ok) {
      revealProblems(checklist.missingDays, checklist.unsetTasks);
      return;
    }
    // Nothing is submitted over unsaved content; a failed flush shows "Not saved".
    if (!(await flush())) return;
    submitReport.mutate(
      { reportId: report._id, requestApproval },
      {
        onSuccess: (view) => navigate(`/reports/${view.weekKey}`),
        onError: (error) => {
          if (error.code === "VALIDATION_FAILED" && error.fields) {
            const { taskFields, days } = submitServerFields(error);
            revealProblems(
              days,
              Object.keys(taskFields).map((path) => path.split(".")[1]),
            );
            return;
          }
          if (error.code === "REPORT_STATE_CHANGED") {
            // The page moves to the read view once the refetch says it is filed.
            const status = statusOf("report", error.details?.status)?.label;
            toastError(
              status ? `This report is now ${status}.` : "This report changed.",
              error,
              { id: `submit-${report._id}` },
            );
            invalidateWeek(queryClient, {
              userId: week.user._id,
              weekKey: week.weekKey,
              reportId: report._id,
            });
            return;
          }
          setSubmitError(errorCopy(error));
        },
      },
    );
  };

  // ---------------------------------------------------------------- the rail
  const blockers = report.days.flatMap((d) =>
    d.blockers.map((b) => ({ ...b, weekday: d.weekday })),
  );
  const taskErrors = Object.values(errors.taskStates ?? {}).some(
    (e) => e?.status,
  );
  const complete = {
    "form-tasks": checklist.unsetTasks.length === 0,
    "form-next-week": filled(values.nextWeek),
    "form-blockers": blockers.length === 0 || Boolean(values.keyBlockerId),
    "form-achievements": filled(values.achievements),
    "form-hours": true,
    "form-notes":
      (values.notes ?? "").trim().length > 0 || filled(values.links, "url"),
  };
  const sections = SECTIONS.map((s) => ({
    ...s,
    complete: complete[s.id],
    hasError: s.id === "form-tasks" && taskErrors,
  }));
  const activeId = useActiveSection(SECTION_IDS);
  const postedDays = WEEKDAYS.filter((d) =>
    report.days.some((day) => day.weekday === d),
  );

  return (
    <div className="mx-auto flex w-full max-w-[calc(200px+44px+var(--form-max)+64px)] justify-center gap-44 px-32 pt-32 pb-32 max-md:px-20">
      <aside className="hidden shrink-0 xl:block">
        <SectionRail
          sections={sections}
          checklist={checklist}
          activeId={activeId}
          weekKey={week.weekKey}
          dayError={dayError}
        />
      </aside>

      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        onBlur={() => void flush()}
        className="flex w-full max-w-[var(--form-max)] min-w-0 flex-col"
      >
        <div className="flex flex-col gap-52">
          <WeekSummary
            week={week}
            holidays={holidays.data ?? {}}
            dayError={dayError}
            onDay={(day) => navigate(`/?week=${week.weekKey}&day=${day}`)}
          />

          {report.status === "needs_correction" && (
            <CorrectionPanel week={week} inForm />
          )}

          <FormSection {...SECTIONS[0]}>
            <TasksTable
              tasks={report.tasks}
              form={form}
              weekKey={week.weekKey}
              postedDays={postedDays}
            />
          </FormSection>

          <FormSection {...SECTIONS[1]} optional>
            <TextList
              form={form}
              name="nextWeek"
              itemLabel="Planned item"
              addLabel="Add an item"
              blank={blankItem}
            />
          </FormSection>

          <FormSection {...SECTIONS[2]}>
            <BlockerPicker
              blockers={blockers}
              keyBlockerId={values.keyBlockerId}
              weekKey={week.weekKey}
              onToggle={(id) =>
                form.setValue(
                  "keyBlockerId",
                  values.keyBlockerId === id ? null : id,
                  { shouldDirty: true },
                )
              }
            />
          </FormSection>

          <FormSection {...SECTIONS[3]} optional>
            <AchievementList form={form} achievements={values.achievements} />
          </FormSection>

          <FormSection {...SECTIONS[4]}>
            <p className="text-caption text-mut">
              Calculated from your daily updates.
            </p>
            <HoursByTypeGrid hoursByType={report.hoursByType} />
          </FormSection>

          <FormSection {...SECTIONS[5]} optional>
            <Field
              label="Notes"
              optional
              error={errors.notes}
              className="w-full"
            >
              <Textarea
                {...form.register("notes")}
                maxLength={5000}
                showCount
                defaultValue={defaultValues.notes}
              />
            </Field>
            <LinkList form={form} />
          </FormSection>
        </div>

        <StickyActionBar
          autosave={autosave}
          checklist={checklist}
          isResubmit={report.status === "needs_correction"}
          submitting={submitReport.isPending}
          error={submitError}
          onSave={() => void flush()}
          onSubmit={onSubmit}
        />
      </form>
    </div>
  );
}

// Above section 01, not a section (design §4.1): the week in mono, the 36px strip, and
// "Days posted: 4 of 4". A day is a way to that day in the day panel.
function WeekSummary({ week, holidays, dayError, onDay }) {
  const expected = week.expectedDays;
  const posted = expected.filter((d) => week.dayStates[d] === "posted").length;
  const missing = posted < expected.length;
  return (
    <div
      id={SUMMARY_ID}
      className="flex scroll-mt-[140px] flex-col gap-8"
      aria-label="This week’s days"
      role="group"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-11 gap-y-4">
        <p className="font-mono text-dense text-body">
          {weekNumberLabel(week.weekKey)} · {formatWeekRange(week.weekKey)}
        </p>
        <p
          className={cn(
            "text-caption",
            missing && dayError ? "text-st-corr-fg" : "text-mut",
          )}
        >
          Days posted:{" "}
          <span className="font-mono">
            {posted} of {expected.length}
          </span>
        </p>
      </div>
      <WeekStrip
        dayStates={week.dayStates}
        days={week.report.days}
        holidays={holidays}
        selected={null}
        onSelect={onDay}
        size="summary"
      />
    </div>
  );
}

// Section 02: repeatable single-line items.
function TextList({ form, name, itemLabel, addLabel, blank }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });
  const appended = useAppendMotion();
  return (
    <div className="flex flex-col gap-8">
      <ol className="flex flex-col gap-8">
        {fields.map((field, i) => (
          <li
            key={field.id}
            className="flex max-w-[600px] items-start gap-8"
            {...appended.props(i)}
          >
            <Field
              error={form.formState.errors[name]?.[i]?.text}
              className="flex-1"
            >
              <Input
                {...form.register(`${name}.${i}.text`)}
                aria-label={`${itemLabel} ${i + 1}`}
                maxLength={500}
              />
            </Field>
            <RemoveButton
              label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
              onClick={() =>
                fields.length > 1
                  ? remove(i)
                  : form.setValue(`${name}.0.text`, "")
              }
            />
          </li>
        ))}
      </ol>
      <AddButton
        disabled={fields.length >= LIST_MAX}
        onClick={() => {
          appended.mark(fields.length);
          append(blank());
        }}
      >
        {addLabel}
      </AddButton>
    </div>
  );
}

// Section 03: the blockers the days raised, each with its day; one may be flagged.
function BlockerPicker({ blockers, keyBlockerId, weekKey, onToggle }) {
  if (blockers.length === 0) {
    return (
      <p className="text-dense text-mut">
        No blockers this week. They are raised in the daily updates.
      </p>
    );
  }
  return (
    <>
      <p className="text-caption text-mut">
        Flag one as the key issue of the week, if there is one. Blockers are
        written and edited in that day’s update.
      </p>
      <ul
        role="radiogroup"
        aria-label="Key blocker"
        className="flex flex-col border-t border-hair"
      >
        {blockers.map((b) => {
          const isKey = b._id === keyBlockerId;
          return (
            <KeyRow key={b._id} isKey={isKey}>
              <KeyFlag
                checked={isKey}
                onToggle={() => onToggle(b._id)}
                label={`Key blocker: ${b.text}`}
              />
              <span className="font-mono text-micro text-mut">
                {WEEKDAY_SHORT[b.weekday]}
              </span>
              <span className="min-w-0 flex-1 text-base break-words text-ink">
                {b.text}
                {isKey && (
                  <span className="ml-8 text-micro font-medium text-acc-txt">
                    Key
                  </span>
                )}
              </span>
              <Link
                to={`/?week=${weekKey}&day=${b.weekday}`}
                className="text-caption whitespace-nowrap text-acc-txt underline-offset-2 hover:underline"
                aria-label={`Edit in ${WEEKDAY_SHORT[b.weekday]}’s update`}
              >
                {WEEKDAY_SHORT[b.weekday]} ›
              </Link>
            </KeyRow>
          );
        })}
      </ul>
    </>
  );
}

// Section 04: typed here — a weekly judgement — and one may be flagged as key.
function AchievementList({ form, achievements }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "achievements",
  });
  const appended = useAppendMotion();
  const toggle = (i) => {
    const turnOn = !achievements?.[i]?.isKey;
    fields.forEach((_, j) =>
      form.setValue(`achievements.${j}.isKey`, turnOn && j === i, {
        shouldDirty: true,
      }),
    );
  };
  return (
    <div className="flex flex-col gap-8">
      <ul
        role="radiogroup"
        aria-label="Key achievement"
        className="flex flex-col gap-8"
      >
        {fields.map((field, i) => {
          const isKey = Boolean(achievements?.[i]?.isKey);
          return (
            <KeyRow key={field.id} isKey={isKey} plain {...appended.props(i)}>
              <KeyFlag
                checked={isKey}
                onToggle={() => toggle(i)}
                label={`Key achievement ${i + 1}`}
              />
              <Field
                error={form.formState.errors.achievements?.[i]?.text}
                className="max-w-[560px] flex-1"
              >
                <Input
                  {...form.register(`achievements.${i}.text`)}
                  aria-label={`Achievement ${i + 1}`}
                  maxLength={500}
                />
              </Field>
              {isKey && (
                <span className="mt-[11px] text-micro font-medium text-acc-txt">
                  Key
                </span>
              )}
              <RemoveButton
                label={`Remove achievement ${i + 1}`}
                onClick={() =>
                  fields.length > 1
                    ? remove(i)
                    : form.setValue("achievements.0", blankAchievement())
                }
              />
            </KeyRow>
          );
        })}
      </ul>
      <AddButton
        disabled={fields.length >= LIST_MAX}
        onClick={() => {
          appended.mark(fields.length);
          append(blankAchievement());
        }}
      >
        Add an achievement
      </AddButton>
    </div>
  );
}

// Section 06's link rows: a label and an http(s) link, two-up from 768px.
function LinkList({ form }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "links",
  });
  const appended = useAppendMotion();
  const errors = form.formState.errors.links;
  return (
    <div className="flex flex-col gap-8">
      <p className="text-dense font-medium text-ink">Links</p>
      <ul className="flex flex-col gap-11">
        {fields.map((field, i) => (
          <li
            key={field.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-start gap-x-20 gap-y-8 max-md:grid-cols-[minmax(0,1fr)_auto]"
            {...appended.props(i)}
          >
            <Field error={errors?.[i]?.label} className="max-md:col-start-1">
              <Input
                {...form.register(`links.${i}.label`)}
                aria-label={`Link ${i + 1} label`}
                placeholder="Label"
                maxLength={500}
              />
            </Field>
            <Field
              error={errors?.[i]?.url}
              className="max-md:col-start-1 max-md:row-start-2"
            >
              <Input
                {...form.register(`links.${i}.url`)}
                type="url"
                inputMode="url"
                aria-label={`Link ${i + 1} address`}
                placeholder="https://"
              />
            </Field>
            <RemoveButton
              label={`Remove link ${i + 1}`}
              className="max-md:col-start-2 max-md:row-start-1"
              onClick={() =>
                fields.length > 1
                  ? remove(i)
                  : form.setValue("links.0", blankLink())
              }
            />
          </li>
        ))}
      </ul>
      <AddButton
        disabled={fields.length >= LIST_MAX}
        onClick={() => {
          appended.mark(fields.length);
          append(blankLink());
        }}
      >
        Add a link
      </AddButton>
    </div>
  );
}

// A flaggable row (design §4.5): selected, it gains a 2px --acc left bar; the change
// crossfades over 160ms.
function KeyRow({ isKey, plain = false, children, ...rowProps }) {
  return (
    <li
      {...rowProps}
      className={cn(
        "relative flex items-start gap-11 pl-11 transition-colors duration-[160ms] ease-linear",
        "before:absolute before:inset-y-0 before:left-0 before:w-2 before:transition-colors before:duration-[160ms]",
        isKey ? "before:bg-acc" : "before:bg-transparent",
        !plain && "items-center border-b border-hair py-8",
      )}
    >
      {children}
    </li>
  );
}

function RemoveButton({ label, onClick, className }) {
  return (
    <Button
      variant="ghost"
      iconOnly
      aria-label={label}
      onClick={onClick}
      className={cn("max-md:size-[var(--ctrl-h-lg)]", className)}
    >
      <X aria-hidden="true" />
    </Button>
  );
}

function AddButton({ children, ...props }) {
  return (
    <Button variant="ghost" size="sm" className="self-start" {...props}>
      <Plus aria-hidden="true" className="size-[12px]" />
      {children}
    </Button>
  );
}
