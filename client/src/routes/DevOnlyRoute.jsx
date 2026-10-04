import { Navigate } from "react-router-dom";

// /design exists in development only; the route table also leaves it out of a
// production build.
export default function DevOnlyRoute({ children }) {
  return import.meta.env.DEV ? children : <Navigate to="/" replace />;
}
