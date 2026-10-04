import { useTheme } from "../../hooks/useTheme.js";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";

// Design §2.3: a two-option segmented control, Light / Dark. Per device, not per
// account — useTheme writes `wv.theme`.

export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  return (
    <SegmentedControl
      ariaLabel="Appearance"
      value={theme}
      onChange={setTheme}
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
      className={className}
    />
  );
}
