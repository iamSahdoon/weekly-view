import { Navigate } from "react-router-dom";
import { AppBootSplash } from "../components/shell/AppBootSplash.jsx";
import { useAuth } from "../hooks/useAuth.js";

// /signin and /signup: a signed-in visitor goes home.
export default function PublicOnly({ children }) {
  const { status } = useAuth();
  if (status === "loading") return <AppBootSplash />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return children;
}
