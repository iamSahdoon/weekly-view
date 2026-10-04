// The --st-corr-bg strip a failed auth form shows above its button (design §3.12).
export function FormStrip({ children }) {
  return (
    <p
      role="alert"
      className="border border-st-corr-bd bg-st-corr-bg px-14 py-11 text-dense text-st-corr-fg"
    >
      {children}
    </p>
  );
}
