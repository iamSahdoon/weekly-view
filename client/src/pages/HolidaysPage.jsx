import { format } from "date-fns";
import { useState } from "react";
import { HolidayModal } from "../components/holiday/HolidayModal.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Table } from "../components/ui/Table.jsx";
import { useDeleteHoliday, useHolidays } from "../hooks/useHolidayQueries.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import { parseCalendarDate } from "../lib/dates.js";
import { errorCopy } from "../lib/errorCopy.js";
import { enumParam } from "../lib/urlParams.js";

// Holidays — /holidays, admins only (design §3.17, frontend_architecture.md §9.13). One
// year at a time, in the URL; a table of date, name and who added it. Add and edit share a
// modal; delete names its effect. Nothing here touches a stored report — a holiday is
// configuration, and everything that depends on it is derived.

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2];
const SPEC = {
  year: enumParam(YEARS.map(String), String(THIS_YEAR)),
};

const dayOf = (holiday) => parseCalendarDate(holiday.date.slice(0, 10));

const COLUMNS = (onEdit, onDelete) => [
  {
    id: "date",
    header: "Date",
    width: 190,
    mono: true,
    cell: (row) => format(dayOf(row), "EEE d MMM yyyy"),
  },
  {
    id: "name",
    header: "Name",
    cell: (row) => <span className="font-medium text-ink">{row.name}</span>,
  },
  {
    id: "addedBy",
    header: "Added by",
    width: 170,
    cell: (row) => row.createdBy?.name ?? "—",
  },
  {
    id: "actions",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    width: 150,
    mobile: "hidden",
    cell: (row) => (
      <span className="inline-flex items-center justify-end gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(row)}
          aria-label={`Edit ${row.name}`}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(row)}
          aria-label={`Delete ${row.name}`}
        >
          Delete
        </Button>
      </span>
    ),
  },
];

export default function HolidaysPage() {
  const { filters, setFilter } = useUrlFilters(SPEC);
  const year = Number(filters.year);
  const holidays = useHolidays(year);
  const remove = useDeleteHoliday();
  // { kind: "form" | "delete", holiday? } — one dialog at a time.
  const [dialog, setDialog] = useState(null);
  const [removeError, setRemoveError] = useState(null);
  const close = () => {
    setDialog(null);
    setRemoveError(null);
  };

  const confirmRemove = () =>
    remove.mutate(dialog.holiday._id, {
      onSuccess: close,
      onError: (error) => setRemoveError(errorCopy(error)),
    });
  const columns = COLUMNS(
    (holiday) => setDialog({ kind: "form", holiday }),
    (holiday) => setDialog({ kind: "delete", holiday }),
  );

  return (
    <>
      <PageHeader
        title="Holidays"
        secondary={
          <Select
            size="sm"
            aria-label="Year"
            className="w-[96px]"
            value={filters.year}
            options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
            onChange={(event) => setFilter("year", event.target.value)}
          />
        }
        primary={
          <Button
            data-tour="add-holiday"
            onClick={() => setDialog({ kind: "form" })}
          >
            Add holiday
          </Button>
        }
      />
      <PageContainer size="doc">
        <p className="mb-20 text-base text-body">
          On a holiday, no one needs to post an update, and project plans skip
          the day.
        </p>
        <QueryView
          query={holidays}
          skeleton={
            <Table columns={columns} rows={[]} isLoading skeletonRows={6} />
          }
          error={
            <InlineError
              title="The holidays didn’t load."
              onRetry={() => holidays.refetch()}
            >
              Check your connection and try again.
            </InlineError>
          }
          isEmpty={(data) => data.items.length === 0}
          empty={
            <div className="border border-hair bg-card">
              <EmptyState
                title={`No holidays for ${year}.`}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => setDialog({ kind: "form" })}
                  >
                    Add holiday
                  </Button>
                }
              >
                Add the days the whole team is off.
              </EmptyState>
            </div>
          }
        >
          {(data) => (
            <Table
              columns={columns}
              rows={data.items}
              isFetching={holidays.isFetching}
              caption={`Holidays ${year}`}
            />
          )}
        </QueryView>
      </PageContainer>

      {dialog?.kind === "form" && (
        <HolidayModal
          holiday={dialog.holiday ?? null}
          year={year}
          open
          onOpenChange={(next) => !next && close()}
        />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && close()}
          title={`Remove “${dialog.holiday.name}”?`}
          confirmLabel="Remove holiday"
          onConfirm={confirmRemove}
          pending={remove.isPending}
        >
          <p>
            Everyone will be expected to post an update on{" "}
            {format(dayOf(dialog.holiday), "EEE d MMM")}, and project plans will
            count it as a working day.
          </p>
          {removeError && (
            <p role="alert" className="mt-11 text-dense text-st-corr-fg">
              {removeError}
            </p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
