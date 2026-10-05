import { formatDateTime } from "../../lib/format.js";
import { StatusChip } from "../ui/StatusChip.jsx";

// The report's state (design §3.6 rail 2): the chip, whether approval was asked, when it
// was submitted (mono) and how many versions there are.

export function ReviewStatusBlock({ report }) {
  const versions = report.revisionNumber;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-8">
        <StatusChip value={report.status} />
        <span className="text-dense text-body">
          {report.approvalRequested ? "Approval asked" : "Approval not asked"}
        </span>
      </div>
      <p className="font-mono text-caption text-mut">
        {report.submittedAt
          ? `Submitted ${formatDateTime(report.submittedAt)}`
          : "Not submitted"}
        {versions > 0 &&
          ` · ${versions} ${versions === 1 ? "version" : "versions"}`}
      </p>
    </div>
  );
}
