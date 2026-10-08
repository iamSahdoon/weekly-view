import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout.jsx";
import RootLayout from "../layouts/RootLayout.jsx";
import DevOnlyRoute from "./DevOnlyRoute.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import IndexRoute from "./IndexRoute.jsx";
import ParamGuard from "./ParamGuard.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import PublicOnly from "./PublicOnly.jsx";
import SessionLayout from "./SessionLayout.jsx";

// The route table (frontend_architecture.md §4.1): every path in the product, with
// its guard. Routes that make no sense in the demo carry handle.realOnly.
//
// Every page is built; each is lazy-loaded behind `page(...)`.

const SignInPage = lazy(() => import("../pages/SignInPage.jsx"));
const SignUpPage = lazy(() => import("../pages/SignUpPage.jsx"));
const ReportDetailPage = lazy(() => import("../pages/ReportDetailPage.jsx"));
const ReportEditPage = lazy(() => import("../pages/ReportEditPage.jsx"));
const ReportHistoryPage = lazy(() => import("../pages/ReportHistoryPage.jsx"));
const TeamUpdatesPage = lazy(() => import("../pages/TeamUpdatesPage.jsx"));
const ReviewDeskPage = lazy(() => import("../pages/ReviewDeskPage.jsx"));
const ReviewPage = lazy(() => import("../pages/ReviewPage.jsx"));
const TeamDashboardPage = lazy(() => import("../pages/TeamDashboardPage.jsx"));
const ProjectsPage = lazy(() => import("../pages/ProjectsPage.jsx"));
const HolidaysPage = lazy(() => import("../pages/HolidaysPage.jsx"));
const UsersPage = lazy(() => import("../pages/UsersPage.jsx"));
const AccountPage = lazy(() => import("../pages/AccountPage.jsx"));
const PeoplePage = lazy(() => import("../pages/PeoplePage.jsx"));
const PersonProfilePage = lazy(() => import("../pages/PersonProfilePage.jsx"));
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
                { path: "/reports", element: page(<ReportHistoryPage />) },
                {
                  path: "/reports/:week",
                  element: guarded(["week"], <ReportDetailPage />),
                },
                {
                  path: "/reports/:week/edit",
                  element: guarded(["week"], <ReportEditPage />),
                },
                { path: "/updates", element: page(<TeamUpdatesPage />) },
                {
                  path: "/people/:userId/reports/:week",
                  element: guarded(["userId", "week"], <ReportDetailPage />),
                },
                { path: "/account", element: page(<AccountPage />) },
              ],
            },
            {
              element: <ProtectedRoute allow={["manager", "admin"]} />,
              children: [
                { path: "/review", element: page(<ReviewDeskPage />) },
                {
                  path: "/review/:reportId",
                  element: guarded(["reportId"], <ReviewPage />),
                },
                { path: "/team", element: page(<TeamDashboardPage />) },
                { path: "/people", element: page(<PeoplePage />) },
                {
                  path: "/people/:userId",
                  element: guarded(["userId"], <PersonProfilePage />),
                },
                { path: "/projects", element: page(<ProjectsPage />) },
              ],
            },
            {
              element: <ProtectedRoute allow={["admin"]} />,
              children: [
                { path: "/users", element: page(<UsersPage />) },
                { path: "/holidays", element: page(<HolidaysPage />) },
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
