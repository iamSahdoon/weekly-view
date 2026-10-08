import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  useCreateHoliday,
  useUpdateHoliday,
} from "../../hooks/useHolidayQueries.js";
import { nextWeekday } from "../../lib/dates.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { reportServerError } from "../../lib/formErrors.js";
import { holidaySchema } from "../../schemas/userSchema.js";
import { Button } from "../ui/Button.jsx";
import { DatePicker } from "../ui/DatePicker.jsx";
import { Field } from "../ui/Field.jsx";
import { InlineError } from "../ui/InlineError.jsx";
import { Input } from "../ui/Input.jsx";
import { Modal } from "../ui/Modal.jsx";

// Add or edit a holiday (design §3.17): a date (Monday to Friday only — a weekend is
// already a day off) and a name. A date that already has one is an inline error on the
// date (HOLIDAY_EXISTS). Mount it when it opens.

export function HolidayModal({ holiday = null, year, open, onOpenChange }) {
  const editing = Boolean(holiday);
  const create = useCreateHoliday();
  const update = useUpdateHoliday();
  const pending = create.isPending || update.isPending;
  const form = useForm({
    resolver: zodResolver(holidaySchema),
    mode: "onTouched",
    defaultValues: {
      date: holiday?.date.slice(0, 10) ?? defaultDate(year),
      name: holiday?.name ?? "",
    },
  });
  const { errors } = form.formState;
  const formId = `holiday-${holiday?._id ?? "new"}`;

  const onError = (error) => {
    if (error?.code === "HOLIDAY_EXISTS") {
      form.setError("date", { type: "server", message: errorCopy(error) });
    } else {
      reportServerError(form, error, errorCopy);
    }
  };
  const onSubmit = (values) => {
    const options = { onSuccess: () => onOpenChange(false), onError };
    if (editing) update.mutate({ id: holiday._id, body: values }, options);
    else create.mutate(values, options);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={editing ? "Edit holiday" : "Add holiday"}
      description="A day the whole team is off"
      dismissible={!pending}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {editing ? "Save changes" : "Add holiday"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-16"
      >
        <Field label="Date" error={errors.date}>
          <Controller
            control={form.control}
            name="date"
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
        <Field label="Name" error={errors.name}>
          <Input autoComplete="off" {...form.register("name")} />
        </Field>
        {errors.root?.server && (
          <InlineError title="The holiday wasn’t saved.">
            {errors.root.server.message}
          </InlineError>
        )}
      </form>
    </Modal>
  );
}

// Today when the chosen year is this one, else the first weekday of that year.
function defaultDate(year) {
  const now = new Date();
  return now.getFullYear() === Number(year)
    ? nextWeekday(now)
    : nextWeekday(new Date(Number(year), 0, 1));
}
