import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { formatDateLong } from "../../lib/format.js";
import { statusOf } from "../../lib/statusMaps.js";

// Design §3.4, Print: "a footer line with week, author, version and print date". On
// screen it does not exist; the print stylesheet shows it as the last line of the page.
// The date is taken when printing starts, not when the page was opened: a tab left open
// overnight prints the day it was printed.

/** "Status: Approved" — the rail's chip is not printed, so the word is. */
export function PrintStatus({ report }) {
  return (
    <p className="print-only text-base text-ink">
      Status: {statusOf("report", report.status)?.label}
      {report.approvalRequested && " · Approval asked"}
    </p>
  );
}

export function PrintFooter({ weekNumber, author, revisionNumber }) {
  const [printedOn, setPrintedOn] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => flushSync(() => setPrintedOn(new Date()));
    window.addEventListener("beforeprint", refresh);
    return () => window.removeEventListener("beforeprint", refresh);
  }, []);
  return (
    <p className="print-only border-t border-hair pt-8 font-mono text-micro text-body">
      Week {weekNumber} · {author}
      {revisionNumber > 0 && ` · rev ${revisionNumber}`} · Printed{" "}
      {formatDateLong(printedOn)}
    </p>
  );
}
