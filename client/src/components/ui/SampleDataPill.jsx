import { useIsDemo } from "../../hooks/useIsDemo.js";
import { cn } from "../../lib/cn.js";

// Design §3.14: the dashed SAMPLE DATA pill in a data panel's header — mono, caps, the
// one sanctioned all-caps string in the product (§0.5). It renders only in the demo.

export function SampleDataPill({ className }) {
  const isDemo = useIsDemo();
  if (!isDemo) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border border-dashed border-rule px-6 py-2 font-mono text-micro leading-none font-medium text-mut",
        className,
      )}
    >
      SAMPLE DATA
    </span>
  );
}
