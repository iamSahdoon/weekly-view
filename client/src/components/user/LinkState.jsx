import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button.jsx";

// The link state of an invite, a re-issue or a reset (design §3.10, frontend_architecture
// §9.12): the modal does not close when the link exists, it swaps its body for this —
// the URL in a --tint block (mono, selectable), `Copy link` (reads `Copied` for 900 ms,
// no toast), one line saying what the link is, and a warning that this is the only time
// it is shown. The URL lives in the caller's component state and nowhere else.

export function LinkBlock({ url, children }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard (an insecure page, a denied permission): the URL is selectable.
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 900);
  };

  return (
    <div className="flex flex-col gap-14">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <p
          data-testid="issued-link"
          className="px-12 min-w-0 flex-1 border border-hair bg-tint py-8 font-mono text-[12px] leading-[1.5] break-all text-ink select-all"
        >
          {url}
        </p>
        <Button variant="secondary" onClick={copy} className="shrink-0">
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <p className="text-caption text-mut">{children}</p>
      <p className="text-caption font-medium text-ink">
        This is the only time the link is shown.
      </p>
    </div>
  );
}
