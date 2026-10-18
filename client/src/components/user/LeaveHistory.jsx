import { formatDateLong } from "../../lib/format.js";
import { Panel } from "../ui/Panel.jsx";
import { Table } from "../ui/Table.jsx";

// A person's leave periods, newest first (owner decision, C4 / C8; shown to managers and
// admins on the profile): when each began, when it ended — "Ongoing" while it is open —
// and who set it. Dates are mono. The data is U2's `leaveHistory`.

const COLUMNS = (personId) => [
  {
    id: "from",
    header: "Start",
    width: 160,
    mono: true,
    cell: (period) => formatDateLong(period.from),
  },
  {
    id: "to",
    header: "End",
    width: 160,
    mono: true,
    cell: (period) =>
      period.to ? (
        formatDateLong(period.to)
      ) : (
        <span className="font-ui text-dense text-ink">Ongoing</span>
      ),
  },
  {
    id: "setBy",
    header: "Set by",
    cell: (period) =>
      !period.setBy
        ? "—"
        : period.setBy._id === personId
          ? "Themselves"
          : period.setBy.name,
  },
];

export function LeaveHistory({ personId, history }) {
  return (
    <Panel title="Leave" padding="none" sample data-tour="leave-history">
      {history.length === 0 ? (
        <p className="px-20 py-14 text-dense text-mut">No leave on record.</p>
      ) : (
        <Table
          columns={COLUMNS(personId)}
          rows={history}
          rowKey={(period) => period.from}
          dense
          caption="Leave history"
          className="[&>div]:border-0"
        />
      )}
    </Panel>
  );
}
