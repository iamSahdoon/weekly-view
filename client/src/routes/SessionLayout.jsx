import { Outlet } from "react-router-dom";

// AppShell when signed in, a bare outlet when not (frontend_architecture.md §4.1).
// The shell is built in C2; until then both branches are the bare outlet.
export default function SessionLayout() {
  return <Outlet />;
}
