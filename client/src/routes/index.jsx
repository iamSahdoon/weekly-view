import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout.jsx";
import RootLayout from "../layouts/RootLayout.jsx";
import DevOnlyRoute from "./DevOnlyRoute.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import PendingPage from "../pages/PendingPage.jsx";
import IndexRoute from "./IndexRoute.jsx";
import ParamGuard from "./ParamGuard.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import PublicOnly from "./PublicOnly.jsx";
import SessionLayout from "./SessionLayout.jsx";

// The route table (frontend_architecture.md §4.1): every path in the product, with
// its guard. Routes that make no sense in the demo carry handle.realOnly.
//
// Pages that a later stage builds render PendingPage until then: C3 replaces the
// report-reading routes (done in C3), C4 "/", C5 the edit route, C6 history / updates / review,
// C7 /team, C8 the rest.

const SignInPage = lazy(() => import("../pages/SignInPage.jsx"));
const SignUpPage = lazy(() => import("../pages/SignUpPage.jsx"));
const ReportDetailPage = lazy(() => import("../pages/ReportDetailPage.jsx"));
const AcceptInvitePage = lazy(() => import("../pages/AcceptInvitePage.jsx"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage.jsx"));
// Defined in development only, so a production build has no /design chunk.
const DesignPage = import.meta.env.DEV
  ? lazy(() => import("../pages/DesignPage.jsx"))
  : null;

const page = (element) => <Suspense fallback={null}>{element}</Suspense>;

// A route with parameters: a malformed one is the not-found page, with no request.
const guarded = (names, element) => (
  <ParamGuard names={names}>{page(element)}</ParamGuard>
);

export function buildRoutes({ withoutRealOnly = false } = {}) {
  const routes = [
    {
      element: <RootLayout />,
      children: [
        {
          element: <AuthLayout />,
          handle: { realOnly: true },
          children: [
            {
              path: "/signin",
              element: <PublicOnly>{page(<SignInPage />)}</PublicOnly>,
            },
            {
              path: "/signup",
              element: <PublicOnly>{page(<SignUpPage />)}</PublicOnly>,
            },
            { path: "/invite/:token", element: page(<AcceptInvitePage />) },
            { path: "/reset/:token", element: page(<ResetPasswordPage />) },
          ],
        },
        {
          element: <SessionLayout />,
          children: [
            { index: true, element: <IndexRoute /> },
            {
              element: <ProtectedRoute />,
              children: [
                {
                  path: "/reports",
                  element: <PendingPage title="My reports" />,
                },
                {
                  path: "/reports/:week",
                  element: guarded(["week"], <ReportDetailPage />),
                },
                {
                  path: "/reports/:week/edit",
                  element: guarded(
                    ["week"],
                    <PendingPage title="Weekly report" />,
                  ),
                },
                {
                  path: "/updates",
                  element: <PendingPage title="Team updates" />,
                },
                {
                  path: "/people/:userId/reports/:week",
                  element: guarded(["userId", "week"], <ReportDetailPage />),
                },
                {
                  path: "/account",
                  element: <PendingPage title="Account" />,
                },
              ],
            },
            {
              element: <ProtectedRoute allow={["manager", "admin"]} />,
              children: [
                {
                  path: "/review",
                  element: <PendingPage title="Review desk" />,
                },
                {
                  path: "/review/:reportId",
                  element: guarded(
                    ["reportId"],
                    <PendingPage title="Review" />,
                  ),
                },
                {
                  path: "/team",
                  element: <PendingPage title="Team dashboard" />,
                },
                { path: "/people", element: <PendingPage title="People" /> },
                {
                  path: "/people/:userId",
                  element: guarded(["userId"], <PendingPage title="Person" />),
                },
                {
                  path: "/projects",
                  element: <PendingPage title="Projects" />,
                },
              ],
            },
            {
              element: <ProtectedRoute allow={["admin"]} />,
              children: [
                { path: "/users", element: <PendingPage title="Users" /> },
                {
                  path: "/holidays",
                  element: <PendingPage title="Holidays" />,
                },
              ],
            },
            // Inside the shell if signed in, standalone if not.
            { path: "*", element: <NotFoundPage /> },
          ],
        },
        import.meta.env.DEV && {
          path: "/design",
          element: <DevOnlyRoute>{page(<DesignPage />)}</DevOnlyRoute>,
          handle: { realOnly: true },
        },
      ].filter(Boolean),
    },
  ];
  return withoutRealOnly ? stripRealOnly(routes) : routes;
}

function stripRealOnly(routes) {
  return routes
    .filter((route) => !route.handle?.realOnly)
    .map((route) =>
      route.children
        ? { ...route, children: stripRealOnly(route.children) }
        : route,
    );
}

export const createAppRouter = ({ demo }) =>
  createBrowserRouter(
    demo ? buildRoutes({ withoutRealOnly: true }) : buildRoutes(),
    demo ? { basename: "/demo" } : undefined,
  );
