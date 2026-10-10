import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import {
  AuthFallback,
  RouteFallback,
} from "../components/shell/RouteFallback.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import RootLayout from "../layouts/RootLayout.jsx";
import DevOnlyRoute from "./DevOnlyRoute.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import IndexRoute from "./IndexRoute.jsx";
import ParamGuard from "./ParamGuard.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import PublicOnly from "./PublicOnly.jsx";
import {
  AccountPage,
  AcceptInvitePage,
  DesignPage,
  HolidaysPage,
  PeoplePage,
  PersonProfilePage,
  ProjectsPage,
  ReportDetailPage,
  ReportEditPage,
  ReportHistoryPage,
  ResetPasswordPage,
  ReviewDeskPage,
  ReviewPage,
  SignInPage,
  SignUpPage,
  TeamDashboardPage,
  TeamUpdatesPage,
  UsersPage,
} from "./pages.js";
import SessionLayout from "./SessionLayout.jsx";

// The route table (frontend_architecture.md §4.1): every path in the product, with
// its guard. Routes that make no sense in the demo carry handle.realOnly.
//
// Every page is built; each is lazy-loaded behind `page(...)`.

// A route chunk loads behind a fallback that is the page's own frame and skeleton, never a
// blank (RouteFallback); `fallback` names its title, shape and width.
const page = (element, fallback) => (
  <Suspense fallback={<RouteFallback {...fallback} />}>{element}</Suspense>
);
// Each page's title, the shape of its skeleton and its width (design §3, §6.16).
const FALLBACK = {
  history: { title: "My reports", kind: "table", size: "wide" },
  week: { title: "Week", kind: "panels" },
  edit: { title: "Weekly report", kind: "panels" },
  updates: { title: "Team updates", kind: "panels" },
  account: { title: "Account", kind: "panels", size: "doc" },
  review: { title: "Review desk", kind: "table", size: "wide" },
  reviewOne: { title: "Review", kind: "panels" },
  team: { title: "Team dashboard", kind: "dashboard", size: "wide" },
  people: { title: "People", kind: "table", size: "wide" },
  person: { title: "Person", kind: "panels" },
  projects: { title: "Projects", kind: "table" },
  users: { title: "Users", kind: "table", size: "wide" },
  holidays: { title: "Holidays", kind: "table", size: "doc" },
};
const authPage = (element) => (
  <Suspense fallback={<AuthFallback />}>{element}</Suspense>
);

// A route with parameters: a malformed one is the not-found page, with no request.
const guarded = (names, element, fallback) => (
  <ParamGuard names={names}>{page(element, fallback)}</ParamGuard>
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
              element: <PublicOnly>{authPage(<SignInPage />)}</PublicOnly>,
            },
            {
              path: "/signup",
              element: <PublicOnly>{authPage(<SignUpPage />)}</PublicOnly>,
            },
            { path: "/invite/:token", element: authPage(<AcceptInvitePage />) },
            { path: "/reset/:token", element: authPage(<ResetPasswordPage />) },
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
                  element: page(<ReportHistoryPage />, FALLBACK.history),
                },
                {
                  path: "/reports/:week",
                  element: guarded(
                    ["week"],
                    <ReportDetailPage />,
                    FALLBACK.week,
                  ),
                },
                {
                  path: "/reports/:week/edit",
                  element: guarded(["week"], <ReportEditPage />, FALLBACK.edit),
                },
                {
                  path: "/updates",
                  element: page(<TeamUpdatesPage />, FALLBACK.updates),
                },
                {
                  path: "/people/:userId/reports/:week",
                  element: guarded(
                    ["userId", "week"],
                    <ReportDetailPage />,
                    FALLBACK.week,
                  ),
                },
                {
                  path: "/account",
                  element: page(<AccountPage />, FALLBACK.account),
                },
              ],
            },
            {
              element: <ProtectedRoute allow={["manager", "admin"]} />,
              children: [
                {
                  path: "/review",
                  element: page(<ReviewDeskPage />, FALLBACK.review),
                },
                {
                  path: "/review/:reportId",
                  element: guarded(
                    ["reportId"],
                    <ReviewPage />,
                    FALLBACK.reviewOne,
                  ),
                },
                {
                  path: "/team",
                  element: page(<TeamDashboardPage />, FALLBACK.team),
                },
                {
                  path: "/people",
                  element: page(<PeoplePage />, FALLBACK.people),
                },
                {
                  path: "/people/:userId",
                  element: guarded(
                    ["userId"],
                    <PersonProfilePage />,
                    FALLBACK.person,
                  ),
                },
                {
                  path: "/projects",
                  element: page(<ProjectsPage />, FALLBACK.projects),
                },
              ],
            },
            {
              element: <ProtectedRoute allow={["admin"]} />,
              children: [
                {
                  path: "/users",
                  element: page(<UsersPage />, FALLBACK.users),
                },
                {
                  path: "/holidays",
                  element: page(<HolidaysPage />, FALLBACK.holidays),
                },
              ],
            },
            // Inside the shell if signed in, standalone if not.
            { path: "*", element: <NotFoundPage /> },
          ],
        },
        import.meta.env.DEV && {
          path: "/design",
          element: <DevOnlyRoute>{authPage(<DesignPage />)}</DevOnlyRoute>,
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
