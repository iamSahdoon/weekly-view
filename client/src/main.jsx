import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";

// The demo is a different page load, not a mode switch (frontend_architecture.md
// §3.1): its code is a chunk the normal app never downloads.
const demo = /^\/demo(\/|$)/.test(window.location.pathname);

async function start() {
  if (demo) await (await import("./demo/bootDemo.js")).bootDemo();
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App demo={demo} />
    </StrictMode>,
  );
}
start();
