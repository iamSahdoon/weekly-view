import { useParams } from "react-router-dom";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import { paramsAreValid } from "../lib/routeParams.js";

// Route parameters are validated before they are used (frontend_architecture.md
// §4.1): a malformed :week, :userId or :reportId is the not-found page, with no
// request made — not the server's 422.
export default function ParamGuard({ names, children }) {
  const params = useParams();
  return paramsAreValid(names, params) ? children : <NotFoundPage />;
}
