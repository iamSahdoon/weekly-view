import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// S0 placeholder. C1 adds the providers, router and styles.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <p>WeeklyView</p>
  </StrictMode>,
);
